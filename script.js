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

        if (response.ok) {
            statusDiv.textContent = 'Status: Workflow triggered! Checking for response...';
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

    // Store timestamp when we started
    const requestTime = Date.now();

    const checkResponse = async () => {
        try {
            // First check the timestamp file
            const timestampResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/latest_response_timestamp.txt`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                    }
                }
            );

            if (timestampResponse.ok) {
                const timestampData = await timestampResponse.json();
                const timestamp = atob(timestampData.content).trim();
                
                // Convert timestamp to milliseconds for comparison
                const responseTime = parseInt(timestamp) * 1000;
                
                // Only proceed if this response is newer than our request
                if (responseTime > requestTime) {
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
                        try {
                            const decodedContent = atob(data.content);
                            const content = JSON.parse(decodedContent);
                            responseDiv.textContent = content.response;
                            statusDiv.textContent = 'Status: Response received!';
                            return true;
                        } catch (parseError) {
                            console.error('Error parsing response:', parseError);
                            statusDiv.textContent = 'Status: Error parsing response';
                            return true;
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error checking response:', error);
        }
        return false;
    };

    const poll = async () => {
        if (attempts >= maxAttempts) {
            statusDiv.textContent = 'Status: Timeout waiting for response';
            return;
        }

        attempts++;
        const finished = await checkResponse();
        
        if (!finished) {
            setTimeout(poll, 2000);
        }
    };

    // Add initial delay to allow workflow to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    poll();
}
