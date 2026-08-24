export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // 1. Extrai a chave do cabeçalho Authorization e remove o "Bearer "
    const authHeader = req.headers.authorization || '';
    const apiKey = authHeader.replace('Bearer ', '').trim();

    // 2. O corpo da requisição já é o objeto com model, messages, stream, etc.
    const body = req.body;

    if (!apiKey || apiKey === 'null' || apiKey === 'undefined') {
      return res.status(401).json({ error: 'API Key não fornecida no cabeçalho.' });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    // 3. Se a Groq retornar erro (ex: 401 ou 404), ela devolve um JSON de erro
    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json(errorData);
    }

    // 4. Se for stream (como no seu Request Data), precisamos repassar o stream corretamente
    if (body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      // Se não for stream, devolve o JSON normal
      const data = await response.json();
      return res.status(response.status).json(data);
    }

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
