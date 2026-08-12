import { getLanguageModelApi } from "./language-model";
import { SNAPINSIGHT_SYSTEM_PROMPT } from "./prompts";

const root = document.getElementById("app") ?? document.body;

root.innerHTML = `
  <main style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:840px; margin:40px auto; padding:0 20px; color:#0f172a;">
    <h1>SnapInsight Prompt API Lab</h1>
    <p style="line-height:1.7; color:#475569;">
      这个实验页直接调用 Chrome 内置 Prompt API。点击会触发模型准备，并依次运行英文和中文解释测试。
    </p>
    <button id="run" style="border:0; border-radius:10px; padding:11px 18px; background:#2563eb; color:white; cursor:pointer;">准备模型并运行验证</button>
    <pre id="status" style="white-space:pre-wrap; margin-top:20px; padding:16px; border-radius:12px; background:#f1f5f9; min-height:72px;"></pre>
    <section style="display:grid; gap:16px; margin-top:20px;">
      <article><h2 style="font-size:18px;">English</h2><div id="english" style="line-height:1.7; padding:16px; border:1px solid #e2e8f0; border-radius:12px;"></div></article>
      <article><h2 style="font-size:18px;">中文</h2><div id="chinese" style="line-height:1.7; padding:16px; border:1px solid #e2e8f0; border-radius:12px;"></div></article>
    </section>
  </main>
`;

const runButton = document.getElementById("run") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLElement;
const english = document.getElementById("english") as HTMLElement;
const chinese = document.getElementById("chinese") as HTMLElement;

async function runCase(prompt: string, output: HTMLElement): Promise<number> {
  const languageModel = getLanguageModelApi();
  if (!languageModel) {
    throw new Error("LanguageModel global is missing.");
  }

  const startedAt = performance.now();
  const session = await languageModel.create({
    initialPrompts: [{ role: "system", content: SNAPINSIGHT_SYSTEM_PROMPT }]
  });
  try {
    const stream = session.promptStreaming(prompt);
    for await (const chunk of stream) {
      output.textContent += chunk;
    }
  } finally {
    session.destroy();
  }

  return performance.now() - startedAt;
}

runButton.addEventListener("click", () => {
  void (async () => {
    runButton.disabled = true;
    english.textContent = "";
    chinese.textContent = "";
    try {
      const languageModel = getLanguageModelApi();
      if (!languageModel) {
        throw new Error(
          "当前扩展页面没有 LanguageModel API。请确认 Chrome 版本与设备支持情况。"
        );
      }

      const availability = await languageModel.availability();
      status.textContent = `availability: ${availability}\n`;
      const prepared = await languageModel.create({
        monitor(monitor) {
          monitor.addEventListener("downloadprogress", (event) => {
            status.textContent = `availability: ${availability}\n下载进度：${Math.round(event.loaded * 100)}%`;
          });
        }
      });
      prepared.destroy();
      status.textContent += "\n模型已准备，开始英文测试。";

      const englishMs = await runCase(
        "Explain retrieval-augmented generation in no more than 80 words.",
        english
      );
      status.textContent += `\n英文完成：${Math.round(englishMs)} ms`;

      const chineseMs = await runCase(
        "请用不超过 120 个汉字解释“检索增强生成”，不要添加标题。",
        chinese
      );
      status.textContent += `\n中文完成：${Math.round(chineseMs)} ms`;
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "Error";
      const message = error instanceof Error ? error.message : String(error);
      status.textContent += `\n失败：${name}: ${message}`;
    } finally {
      runButton.disabled = false;
    }
  })();
});
