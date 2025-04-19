async function testCustomLLM() {
  try {
    console.log('Testing custom-llm-proxy endpoint...');
    
    const response = await fetch('http://localhost:3000/api/custom-llm-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instruction: "Show me the total number of Swap events this week"
      })
    });

    const data = await response.json();
    console.log('\nResponse from custom-llm-proxy:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!data.success) {
      throw new Error(`API error: ${data.error}`);
    }

    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('\nTest failed with error:', error);
  }
}

// Run the testgi
testCustomLLM(); 