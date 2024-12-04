console.log('Script loaded!');

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
    console.log('Sending request with prompts:', { systemPrompt, userPrompt });

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
                        system_prompt: systemPrompt || '',
                        user_prompt: userPrompt
                    }
                })
            }
        );

        console.log('Workflow trigger response:', response.status);

        if (response.ok) {
            statusDiv.textContent = 'Status: Workflow triggered! Checking for response...';
            console.log('Starting response polling...');
            pollForResponse();
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('Error triggering workflow:', error);
        statusDiv.textContent = `Status: Error - ${error.message}`;
    }
}

async function pollForResponse() {
    const responseDiv = document.getElementById('response');
    const statusDiv = document.getElementById('status');
    const token = document.getElementById('githubToken').value;
    let attempts = 0;
    const maxAttempts = 30;
    
    // Store the timestamp when we started
    const startTime = Date.now();

    const checkWorkflowRun = async () => {
        try {
            // Get the latest workflow runs
            console.log('Checking workflow runs...');
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
                console.log('Workflow runs data:', runsData);
                
                if (runsData.workflow_runs.length === 0) {
                    console.log('No workflow runs found');
                    return false;
                }

                const latestRun = runsData.workflow_runs[0];
                console.log('Latest run status:', latestRun.status, 'Updated at:', latestRun.updated_at);

                if (latestRun.status === 'completed') {
                    // Now check for the response file
                    console.log('Checking response file...');
                    const fileResponse = await fetch(
                        `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/response.json?t=${Date.now()}`,
                        {
                            headers: {
                                'Authorization': `token ${token}`,
                                'Accept': 'application/vnd.github.v3+json',
                                'Cache-Control': 'no-cache'
                            }
                        }
                    );

                    if (fileResponse.ok) {
                        const data = await fileResponse.json();
                        console.log('Response file data:', data);
                        
                        try {
                            const decodedContent = atob(data.content);
                            console.log('Decoded content:', decodedContent);
                            const content = JSON.parse(decodedContent);
                            console.log('Parsed content:', content);
                            
                            responseDiv.textContent = content.response;
                            statusDiv.textContent = 'Status: Response received!';
                            return true;
                        } catch (parseError) {
                            console.error('Error parsing response:', parseError);
                            statusDiv.textContent = 'Status: Error parsing response';
                            return true;
                        }
                    } else {
                        console.log('Error fetching response file:', fileResponse.status);
                        return false;
                    }
                } else if (latestRun.status === 'failure') {
                    console.log('Workflow failed');
                    statusDiv.textContent = 'Status: Workflow failed';
                    return true;
                }
                
                statusDiv.textContent = `Status: Workflow ${latestRun.status}...`;
            } else {
                console.log('Error checking workflow runs:', runsResponse.status);
            }
        } catch (error) {
            console.error('Error checking workflow:', error);
        }
        return false;
    };

    const poll = async () => {
        if (attempts >= maxAttempts) {
            console.log('Polling timeout reached');
            statusDiv.textContent = 'Status: Timeout waiting for response';
            return;
        }

        attempts++;
        console.log(`Polling attempt ${attempts}/${maxAttempts}`);
        const finished = await checkWorkflowRun();
        
        if (!finished && attempts < maxAttempts) {
            setTimeout(poll, 2000); // Check every 2 seconds
        } else {
            if (!finished) {
                statusDiv.textContent = 'Status: Polling timeout reached';
            }
            console.log('Polling complete');
        }
    };

    poll();
}
