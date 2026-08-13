const fallbackMessages = {
  optionsTitle: "SnapInsight 设备状态",
  optionsTagline: "Chrome 设备端 AI 解释，网页内容无需发送到外部服务器。",
  statusReadyTitle: "设备端模型已就绪",
  statusReadyMessage: "现在可以在普通网页中选中文字，将鼠标悬停在 SI 上获取解释。",
  statusDownloadableTitle: "需要准备设备端模型",
  statusDownloadableMessage: "点击下方按钮，由 Chrome 下载并准备模型。首次准备可能需要几分钟。",
  statusDownloadingTitle: "Chrome 正在下载模型",
  statusDownloadingMessage: "保持 Chrome 打开；也可以点击继续准备以查看当前进度。",
  statusPreparingTitle: "正在准备模型",
  statusPreparingConnecting: "正在连接 Chrome 设备端模型…",
  statusPreparingProgress: "模型下载进度：$1%",
  statusUnsupportedTitle: "当前设备暂不支持",
  statusUnsupportedMessage: "请使用 Chrome 138 或更高版本，并确认设备满足 Chrome 内置 AI 的硬件、存储空间和地区要求。",
  statusErrorTitle: "模型准备失败",
  statusErrorMessage: "暂时无法准备设备端模型，请稍后重试。",
  statusCheckingTitle: "正在检查设备",
  statusCheckingMessage: "正在确认 Chrome Prompt API 和设备端模型状态…",
  prepareModel: "准备本地模型",
  recheck: "重新检查",
  usageTitle: "使用说明",
  usageStep1: "打开任意普通网页，选中 1–20 个中文字符或英文单词。",
  usageStep2: "将鼠标悬停在选区附近的 SI 按钮上。",
  usageStep3: "阅读简短解释，或点击“查看更多”生成详细解释。",
  privacyTitle: "隐私与兼容性",
  privacyItem1: "扩展只把你选中的文字交给 Chrome 设备端模型。",
  privacyItem2: "扩展不申请网站主机访问权限，也不连接 SnapInsight 后端。",
  privacyItem3: "模型由 Chrome 管理；首次下载由 Chrome 自身完成。",
  privacyItem4: "中文生成当前属于实验性能力，质量可能因 Chrome 版本而变化。",
  cardOpen: "打开 SnapInsight 解释卡片",
  cardLabel: "SnapInsight 解释",
  cardClose: "关闭卡片",
  shortGenerating: "正在生成简短解释...",
  modelStartingSlow: "正在启动设备端模型，首次使用可能稍慢...",
  waitingFirstToken: "模型已启动，正在等待第一段解释...",
  cancelGeneration: "取消生成",
  shortLabel: "简短解释",
  shortCopy: "复制简短解释",
  shortRegenerate: "重新生成简短解释",
  explanationGenerating: "正在生成解释...",
  contentStreaming: "内容正在持续生成...",
  explanationUnavailable: "解释暂时不可用",
  explanationPreparing: "正在准备解释请求...",
  openDeviceStatus: "打开设备状态",
  retry: "重试",
  viewMore: "查看更多",
  detailLabel: "详细解释",
  detailGenerating: "正在生成更完整的解释...",
  detailCopy: "复制详细解释",
  detailRegenerate: "重新生成详细解释",
  detailStreaming: "详细解释正在持续生成...",
  detailRetry: "重试详细解释",
  detailHint: "点击查看更多后会在这里展开详细解释。",
  errorServiceUnavailable: "Chrome 设备端模型暂时不可用，请稍后重试。",
  errorPromptApiUnavailable: "当前 Chrome 未提供 Prompt API，请更新浏览器。",
  errorModelDownloadRequired: "首次使用前需要先准备 Chrome 设备端模型。",
  errorModelDownloading: "Chrome 正在下载设备端模型，请等待完成后重试。",
  errorDeviceUnsupported: "当前设备不符合 Chrome 设备端模型的运行要求。",
  errorLanguageUnsupported: "当前 Chrome 设备端模型暂不支持这段文字的语言。",
  errorQuotaExceeded: "设备端模型容量暂时不足，请关闭其他生成任务后重试。",
  errorReadinessTimeout: "检查设备端模型状态超时，请重试。",
  errorModelStartupTimeout: "设备端模型启动超时，请重试。",
  errorFirstTokenTimeout: "设备端模型响应超时，请重试。",
  errorStreamStalled: "设备端模型停止输出，请重试。",
  errorRequestCancelled: "已取消生成，可以重新尝试。",
  preparationInterrupted: "模型准备过程意外中断，请重新检查后再试。",
  preparationApiMissing: "当前 Chrome 未提供 Prompt API，请更新浏览器后重试。",
  preparationDeviceUnsupported: "当前设备不符合 Chrome 设备端模型的运行要求。",
  preparationLanguageUnsupported: "Chrome 设备端模型拒绝了当前语言配置。",
  preparationQuotaExceeded: "设备端模型容量暂时不足，请关闭其他 AI 会话后重试。",
  preparationDownloadFailed: "模型下载或初始化失败，请检查网络、磁盘空间后重试。",
  readinessReadFailed: "无法读取 Chrome 设备端模型状态，请重新打开此页面。"
} as const;

export type MessageKey = keyof typeof fallbackMessages;

function applySubstitutions(message: string, substitutions: string[]): string {
  return substitutions.reduce(
    (result, substitution, index) =>
      result.replaceAll(`$${index + 1}`, substitution),
    message
  );
}

export function t(
  key: MessageKey,
  substitutions: string | number | Array<string | number> = []
): string {
  const values = (Array.isArray(substitutions) ? substitutions : [substitutions]).map(String);
  const i18n = globalThis.chrome?.i18n;
  const localized = i18n?.getMessage(key, values);

  return localized || applySubstitutions(fallbackMessages[key], values);
}

export function getUiLanguage(): string {
  return globalThis.chrome?.i18n?.getUILanguage?.() || "zh-CN";
}
