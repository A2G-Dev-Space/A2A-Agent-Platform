import { AgentFramework } from '@/types';

/**
 * Download example code for the specified framework
 * Opens GitHub repository in new tab for downloading
 */
export async function downloadExampleCode(framework: AgentFramework): Promise<void> {
  const folderName = framework === AgentFramework.ADK ? 'test_adk' : 'test_agno';

  // For now, redirect to GitHub repository or download page
  // In the future, this can be enhanced to create a zip file on the fly
  const repoUrl = `https://github.com/your-org/A2A-Agent-Platform/tree/main/${folderName}`;

  // Alternative: Download files via backend API
  const baseUrl = window.location.origin;
  const downloadUrl = `${baseUrl}/api/examples/download/${folderName}`;

  try {
    // Try to download via backend API first
    const response = await fetch(downloadUrl);

    if (response.ok) {
      // If API exists, download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}_example.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      // Fallback: Open GitHub repository or show message
      alert(`Please download the example code from the repository: ${folderName}`);
      // Optionally open in new tab
      // window.open(repoUrl, '_blank');
    }
  } catch (error) {
    console.error('Error downloading example code:', error);
    alert(`Please download the example code manually from the repository.`);
  }
}
