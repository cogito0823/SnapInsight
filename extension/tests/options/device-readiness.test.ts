import test from "node:test";
import assert from "node:assert/strict";

import {
  preparePromptModel,
  readPromptReadiness
} from "../../src/prompt-api/readiness";
import { renderOptionsPage } from "../../src/options/components/options-page";
import { formatElapsedTime } from "../../src/options/state/options-state";

test("device status page presents first-run preparation and privacy guidance", () => {
  const html = renderOptionsPage({
    phase: "downloadable",
    progress: null,
    progressStage: null,
    progressScope: null,
    errorMessage: null
  });
  assert.match(html, /准备本地模型/);
  assert.match(html, /不申请网站主机访问权限/);
  assert.match(html, /只把你选中的文字/);
  assert.doesNotMatch(html, /Ollama|本地服务/);
});

test("readiness maps missing and available Prompt API states", async () => {
  const original = globalThis.LanguageModel;
  let availabilityOptions: unknown;
  try {
    globalThis.LanguageModel = undefined;
    assert.deepEqual(await readPromptReadiness(), {
      state: "unsupported",
      availability: "missing"
    });
    globalThis.LanguageModel = {
      availability: async (options) => {
        availabilityOptions = options;
        return "available";
      },
      create: async () => {
        throw new Error("not needed");
      }
    };
    assert.deepEqual(await readPromptReadiness(), {
      state: "ready",
      availability: "available"
    });
    assert.deepEqual(availabilityOptions, {
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }]
    });
  } finally {
    globalThis.LanguageModel = original;
  }
});

test("first-run preparation reports only meaningful download progress and destroys its probe session", async () => {
  const original = globalThis.LanguageModel;
  const progress: Array<{
    percentage: number | null;
    stage: "downloading" | "installing";
  }> = [];
  let destroyed = false;
  let createOptions: Parameters<NonNullable<typeof globalThis.LanguageModel>["create"]>[0];
  try {
    globalThis.LanguageModel = {
      availability: async () => "downloadable",
      create: async (options) => {
        createOptions = options;
        options?.monitor?.({
          addEventListener: (_type, listener) => {
            listener({ loaded: 0 } as Event & { loaded: number });
            listener({ loaded: 0.42 } as Event & { loaded: number });
            listener({ loaded: 0.999 } as Event & { loaded: number });
            listener({ loaded: 1 } as Event & { loaded: number });
          }
        });
        return {
          prompt: async () => "",
          promptStreaming: () => new ReadableStream<string>(),
          destroy: () => {
            destroyed = true;
          }
        };
      }
    };
    await preparePromptModel({ onProgress: (value) => progress.push(value) });
    assert.deepEqual(progress, [
      { percentage: null, stage: "downloading" },
      { percentage: 42, stage: "downloading" },
      { percentage: 99, stage: "downloading" },
      { percentage: null, stage: "installing" }
    ]);
    assert.deepEqual(createOptions?.expectedInputs, [
      { type: "text", languages: ["en"] }
    ]);
    assert.deepEqual(createOptions?.expectedOutputs, [
      { type: "text", languages: ["en"] }
    ]);
    assert.equal(destroyed, true);
  } finally {
    globalThis.LanguageModel = original;
  }
});

test("downloading state auto-updates and offers an explicit live-progress reconnect", () => {
  const html = renderOptionsPage({
    phase: "downloading",
    progress: null,
    progressStage: "downloading",
    progressScope: null,
    errorMessage: null
  });

  assert.match(html, /完成后本页会自动更新/);
  assert.match(html, /snapinsight-progress-indeterminate/);
  assert.match(html, />展示实时进度<\/button>/);
  assert.doesNotMatch(html, /继续查看进度|重新检查|准备本地模型/);
});

test("preparing without browser progress renders an indeterminate indicator", () => {
  const html = renderOptionsPage({
    phase: "preparing",
    progress: null,
    progressStage: "downloading",
    progressScope: "overall",
    errorMessage: null
  });

  assert.match(html, /尚未提供可显示的百分比/);
  assert.match(html, /snapinsight-progress-indeterminate/);
  assert.match(html, /aria-valuetext="进度未知，正在处理中"/);
  assert.match(html, /data-indeterminate="true"/);
  assert.doesNotMatch(html, /aria-valuenow=/);
});

test("preparing shows a determinate bar only for a meaningful browser percentage", () => {
  const html = renderOptionsPage({
    phase: "preparing",
    progress: 42,
    progressStage: "downloading",
    progressScope: "overall",
    errorMessage: null
  });

  assert.match(html, /模型下载进度：42%/);
  assert.match(html, /aria-valuenow="42"/);
});

test("download completion switches to an indeterminate installation state", () => {
  const html = renderOptionsPage({
    phase: "preparing",
    progress: null,
    progressStage: "installing",
    progressScope: "overall",
    errorMessage: null
  });

  assert.match(html, /下载完成，正在安装模型/);
  assert.match(html, /解压、安装或加载/);
  assert.match(html, /snapinsight-progress-indeterminate/);
});

test("reconnected progress is labeled as remaining work", () => {
  const html = renderOptionsPage({
    phase: "preparing",
    progress: 1,
    progressStage: "downloading",
    progressScope: "remaining",
    errorMessage: null
  });

  assert.match(html, /剩余内容下载进度：1%/);
  assert.match(html, /该百分比按重新连接时的剩余内容计算/);
  assert.match(html, /color:#64748b; font-size:13px/);
  assert.ok(html.indexOf("准备已用时") < html.indexOf("剩余内容下载进度"));
  assert.ok(
    html.indexOf('role="progressbar"') <
      html.indexOf("该百分比按重新连接时的剩余内容计算")
  );
});

test("elapsed preparation time uses minutes and hours", () => {
  assert.equal(formatElapsedTime(17_000), "00:17");
  assert.equal(formatElapsedTime(65_000), "01:05");
  assert.equal(formatElapsedTime(3_661_000), "01:01:01");
});
