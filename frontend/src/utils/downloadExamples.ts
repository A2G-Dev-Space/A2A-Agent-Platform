import { AgentFramework } from '@/types';

/**
 * Download example code for the specified framework
 * Downloads zip file from public/examples folder
 */
export async function downloadExampleCode(framework: AgentFramework): Promise<void> {
  const folderName =
    framework === AgentFramework.ADK ? 'test_adk' :
    framework === AgentFramework.LANGCHAIN ? 'test_langchain' :
    'test_agno';
  const fileName = `${folderName}.zip`;

  // Path to zip file in public folder
  const downloadUrl = `/examples/${fileName}`;

  try {
    // Fetch the zip file
    const response = await fetch(downloadUrl);

    if (response.ok) {
      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } else {
      throw new Error(`Failed to download: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error downloading example code:', error);
    alert(`Failed to download example code. Please try again or contact support.`);
  }
}
