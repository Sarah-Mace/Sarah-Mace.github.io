async function sendMessage() {
    const apiKey = document.getElementById('apiKey').value;
    const prompt = document.getElementById('prompt').value;
    const responseDiv = document.getElementById('response');
    
    if (!apiKey || !prompt) {
        alert('Please enter both API key and prompt');
        return;
    }

    responseDiv.textContent = 'Loading...';

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-opus-20240229',
                max_tokens: 1024,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            responseDiv.textContent = `Error: ${data.error.message}`;
        } else {
            responseDiv.textContent = data.content[0].text;
        }
    } catch (error) {
        responseDiv.textContent = `Error: ${error.message}`;
    }
}
