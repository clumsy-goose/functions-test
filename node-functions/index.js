export async function onRequest(context) {
    console.log('打印测试');
    return new Response(`Hello, world! from Hello World Cloud Function index.js `);
}
