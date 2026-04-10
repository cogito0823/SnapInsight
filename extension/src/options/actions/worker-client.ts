import type {
  ModelsListMessage,
  ModelsListResponse,
  ReadSelectedModelResponse,
  SettingsGetSelectedModelMessage,
  SettingsSetSelectedModelMessage,
  SettingsSetSelectedModelResponse
} from "../../shared/contracts/messages";

async function sendMessage<TResponse>(
  message:
    | ModelsListMessage
    | SettingsGetSelectedModelMessage
    | SettingsSetSelectedModelMessage
): Promise<TResponse> {
  return chrome.runtime.sendMessage(message) as Promise<TResponse>;
}

export function requestSelectedModel(): Promise<ReadSelectedModelResponse> {
  return sendMessage<ReadSelectedModelResponse>({
    type: "settings.getSelectedModel"
  });
}

export function requestModelCatalog(): Promise<ModelsListResponse> {
  return sendMessage<ModelsListResponse>({
    type: "models.list"
  });
}

export function persistSelectedModel(
  selectedModel: string
): Promise<SettingsSetSelectedModelResponse> {
  return sendMessage<SettingsSetSelectedModelResponse>({
    type: "settings.setSelectedModel",
    payload: {
      selectedModel
    }
  });
}
