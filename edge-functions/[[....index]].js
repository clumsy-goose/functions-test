export function onRequest(context) {
  const json = JSON.stringify({
    "code": 0,
    "message": "Hello 全部进这里"
  });
  return new Response(json, {
    headers: {
      'content-type': 'application/json',
      'x-edgefunctions': 'Welcome to use EdgeOne Pages Functions.',
    },
  });
}

