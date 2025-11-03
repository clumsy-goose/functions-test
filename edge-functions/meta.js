export function onRequest(context) {
  const json = JSON.stringify({
    "code": 0,
    "message": "Hello Meta111"
  });
  return new Response(json, {
    headers: {
      'content-type': 'application/json',
      'x-edgefunctions': 'Welcome to use EdgeOne Pages Functions.',
    },
  });
}

