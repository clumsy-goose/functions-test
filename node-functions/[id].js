export async function onRequest(context) {
    console.log("🚀 ~ onRequest ~ context:", context);
    return new Response("Hello, world! from Hello World Cloud Function[id] 动态路由 ");
}
