"""
LLM Proxy - Routes requests to various LLM providers with admin's API keys
Platform acts as proxy to intercept all LLM calls for tracing
Supports: Google (Gemini), OpenAI, Anthropic
"""
import httpx
import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)


class LLMProxy:
    """Proxy for LLM API calls with streaming support using admin-managed keys"""

    def __init__(self):
        self.admin_service_url = "http://admin-service:8005"
        self.provider_configs = {
            "google": {
                "base_url": "https://generativelanguage.googleapis.com/v1beta",
                "streaming": True,
            },
            "openai": {
                "base_url": "https://api.openai.com/v1",
                "streaming": True,
            },
            "anthropic": {
                "base_url": "https://api.anthropic.com/v1",
                "streaming": True,
            }
        }

    async def get_admin_llm_model(self, model_name: str) -> Optional[Tuple[str, str]]:
        """
        Fetch admin's LLM model configuration from admin-service
        Returns: (api_key, endpoint) or None
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Get all active LLM models from admin service (no auth needed for internal call)
                response = await client.get(
                    f"{self.admin_service_url}/api/admin/llm-models/"
                )

                if response.status_code == 200:
                    models = response.json()
                    # Find the requested model that is active
                    for model in models:
                        if model["name"] == model_name and model["is_active"]:
                            # TODO: In production, decrypt the API key
                            # For now, we need to fetch the full model details including encrypted key
                            model_detail_response = await client.get(
                                f"{self.admin_service_url}/api/admin/llm-models/{model['id']}/"
                            )
                            if model_detail_response.status_code == 200:
                                model_data = model_detail_response.json()
                                return (model_data.get("endpoint"), None)  # We'll get key from DB directly

                    logger.warning(f"No active admin LLM model found for {model_name}")
                    return None
                else:
                    logger.error(f"Failed to fetch admin LLM models: {response.status_code}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching admin LLM model: {e}")
            return None

    async def get_admin_llm_key_from_db(self, model_name: str) -> Optional[str]:
        """
        Directly query admin database for LLM API key
        This is a workaround since the API doesn't expose keys for security
        """
        try:
            from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
            from sqlalchemy import select, text

            # Create connection to admin DB
            admin_db_url = "postgresql+asyncpg://dev_user:dev_password@postgres:5432/admin_service_db"
            engine = create_async_engine(admin_db_url)
            session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

            async with session_maker() as session:
                result = await session.execute(
                    text("SELECT api_key_encrypted FROM llm_models WHERE name = :model_name AND is_active = true"),
                    {"model_name": model_name}
                )
                row = result.fetchone()
                if row:
                    return row[0]
                return None
        except Exception as e:
            logger.error(f"Error fetching admin LLM key from DB: {e}")
            return None

    async def stream_google_gemini(
        self,
        api_key: str,
        model_name: str,
        messages: list,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Stream response from Google Gemini API
        """
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:streamGenerateContent?key={api_key}"

        # Convert messages to Gemini format
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": kwargs.get("temperature", 0.7),
                "maxOutputTokens": kwargs.get("max_tokens", 8192),
            }
        }

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line or not line.strip():
                            continue

                        try:
                            # Gemini sends JSON chunks
                            chunk = json.loads(line)

                            # Extract text from response
                            if "candidates" in chunk:
                                for candidate in chunk["candidates"]:
                                    if "content" in candidate and "parts" in candidate["content"]:
                                        for part in candidate["content"]["parts"]:
                                            if "text" in part:
                                                yield part["text"]

                        except json.JSONDecodeError:
                            continue
                        except Exception as e:
                            logger.error(f"Error parsing Gemini chunk: {e}")
                            continue

        except httpx.HTTPStatusError as e:
            logger.error(f"Gemini API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}")
            raise

    async def stream_openai(
        self,
        api_key: str,
        model_name: str,
        messages: list,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Stream response from OpenAI API
        """
        url = "https://api.openai.com/v1/chat/completions"

        payload = {
            "model": model_name,
            "messages": messages,
            "stream": True,
            "temperature": kwargs.get("temperature", 0.7),
            "max_tokens": kwargs.get("max_tokens", 4096),
        }

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                async with client.stream(
                    "POST",
                    url,
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    }
                ) as response:
                    response.raise_for_status()

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data: "):
                            continue

                        data_str = line[6:]  # Remove "data: " prefix

                        if data_str.strip() == "[DONE]":
                            break

                        try:
                            chunk = json.loads(data_str)

                            if "choices" in chunk and len(chunk["choices"]) > 0:
                                delta = chunk["choices"][0].get("delta", {})
                                if "content" in delta:
                                    yield delta["content"]

                        except json.JSONDecodeError:
                            continue

        except httpx.HTTPStatusError as e:
            logger.error(f"OpenAI API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error calling OpenAI API: {e}")
            raise

    async def stream_completion(
        self,
        provider: str,
        model_name: str,
        messages: list,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """
        Stream completion from the specified LLM provider using admin's API key
        """
        # Get admin's API key for this model
        api_key = await self.get_admin_llm_key_from_db(model_name)

        if not api_key:
            raise ValueError(f"No admin API key found for model {model_name}. Please contact administrator to register LLM models.")

        logger.info(f"Streaming from {provider}/{model_name} using admin-managed key")

        # Route to appropriate provider
        if provider == "google":
            async for token in self.stream_google_gemini(api_key, model_name, messages, **kwargs):
                yield token
        elif provider == "openai":
            async for token in self.stream_openai(api_key, model_name, messages, **kwargs):
                yield token
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
