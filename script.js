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
    const maxAttempts = 30; // 30 attempts * 2 seconds = 60 seconds maximum wait

    const checkResponse = async () => {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/response.json`,
                {
                    headers: {
                        'Authorization': `token ${token}`,
                        'Accept': 'application/vnd.github.v3+json',
                    }
                }
            );

            if (response.ok) {
                const data = await response.json();
                const content = JSON.parse(atob(data.content));
                responseDiv.textContent = content.response;
                statusDiv.textContent = 'Status: Response received!';
                return true;
            }
        } catch (error) {
            console.log('Still waiting for response...');
        }
        return false;
    };

    const poll = async () => {
        if (attempts >= maxAttempts) {
            statusDiv.textContent = 'Status: Timeout waiting for response';
            return;
        }

        attempts++;
        const found = await checkResponse();
        
        if (!found) {
            setTimeout(poll, 2000); // Check every 2 seconds
        }
    };

    poll();
}
