export default function onRequest(context) {
  return new Response('Hello World'+JSON.stringify(context.request.url, null, 2));
}