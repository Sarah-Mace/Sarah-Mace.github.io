const GITHUB_USERNAME = 'Sarah-Mace';
const GITHUB_REPO = 'Sarah-Mace.github.io';

async function triggerWorkflow() {
    const token = document.getElementById('githubToken').value;
    const systemPrompt = document.getElementById('systemPrompt').value;
    const userPrompt = document.getElementById('userPrompt').value;
    const statusDiv = document.getElementById('status');
    const responseDiv = document.getElementById('response');

    if (!token || !userPrompt) {
        alert('Please enter both GitHub token and user prompt');
        return;
    }

    statusDiv.textContent = 'Status: Triggering workflow...';

    try {
        // Trigger the workflow
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event_type: 'claude_chat',
                    client_payload: {
                        system_prompt: systemPrompt,
                        user_prompt: userPrompt
                    }
                })
            }
        );

        if (response.ok) {
            statusDiv.textContent = 'Status: Workflow triggered! Checking for response...';
            // Start polling for response
            pollForResponse();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        statusDiv.textContent = `Status: Error - ${error.message}`;
    }
}

async function pollForResponse() {
    const responseDiv = document.getElementById('response');
    const statusDiv = document.getElementById('status');
    const token = document.getElementById('githubToken').value;
    let attempts = 0;
    const maxAttempts = 30;

    const checkWorkflowRun = async () => {
        try {
            // Get the latest workflow runs
            const runsResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/actions/runs?event=repository_dispatch`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                    }
                }
            );

            if (runsResponse.ok) {
                const runsData = await runsResponse.json();
                const latestRun = runsData.workflow_runs[0];

                if (latestRun.status === 'completed') {
                    // Now check for the response file
                    const fileResponse = await fetch(
                        `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/response.json`,
                        {
                            headers: {
                                'Authorization': `token ${token}`,
                                'Accept': 'application/vnd.github.v3+json',
                            }
                        }
                    );

                    if (fileResponse.ok) {
                        const data = await fileResponse.json();
                        const content = JSON.parse(atob(data.content));
                        responseDiv.textContent = content.response;
                        statusDiv.textContent = 'Status: Response received!';
                        return true;
                    } else if (fileResponse.status === 404) {
                        statusDiv.textContent = 'Status: Workflow completed but no response file found';
                        return true;
                    }
                } else if (latestRun.status === 'failure') {
                    statusDiv.textContent = 'Status: Workflow failed';
                    return true;
                }
                
                statusDiv.textContent = `Status: Workflow ${latestRun.status}...`;
            }
        } catch (error) {
            console.log('Error checking workflow:', error);
        }
        return false;
    };

    const poll = async () => {
        if (attempts >= maxAttempts) {
            statusDiv.textContent = 'Status: Timeout waiting for response';
            return;
        }

        attempts++;
        const finished = await checkWorkflowRun();
        
        if (!finished) {
            setTimeout(poll, 2000); // Check every 2 seconds
        }
    };

    poll();
}

