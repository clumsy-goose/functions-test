export default function onRequest(context) {
  console.log("🚀 ~ onRequest ~ url:", context.request.url);
  return new Response('Hello World'+JSON.stringify(context.request.url, null, 2));
}