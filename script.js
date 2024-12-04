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
                console.log('Latest run status:', latestRun.status);

                if (latestRun.status === 'completed') {
                    // Check if this run completed after we started polling
                    const runCompletedAt = new Date(latestRun.updated_at).getTime();
                    if (runCompletedAt < startTime) {
                        console.log('Found old completed run, waiting for new one...');
                        return false;
                    }

                    // Now check for the response file
                    console.log('Checking response file...');
                    const fileResponse = await fetch(
                        `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/response.json?timestamp=${Date.now()}`,
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
                    } else if (fileResponse.status === 404) {
                        console.log('Response file not found');
                        statusDiv.textContent = 'Status: Workflow completed but no response file found';
                        return false;  // Changed to false to keep polling
                    } else {
                        console.log('Error fetching response file:', fileResponse.status);
                        statusDiv.textContent = `Status: Error fetching response - ${fileResponse.status}`;
                        return false;  // Changed to false to keep polling
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
        
        if (!finished) {
            setTimeout(poll, 2000); // Check every 2 seconds
        }
    };

    poll();
}
