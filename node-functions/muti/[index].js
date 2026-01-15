export async function onRequest(context) {
      console.log("🚀 ~ onRequest ~ context:", context);
      return new Response(`Hello, world! from Hello World Cloud Function[${context.params.index}] [[index]] 动态路由 `);
    }
