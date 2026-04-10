import {
  countSelectionUnits,
  normalizeSelectionText
} from "./count-selection-units";

export interface ValidatedSelection {
  isValid: boolean;
  normalizedText: string;
  unitCount: number;
}

export function validateSelection(text: string): ValidatedSelection {
  const normalizedText = normalizeSelectionText(text);
  const unitCount = countSelectionUnits(normalizedText);

  return {
    isValid: unitCount >= 1 && unitCount <= 20,
    normalizedText,
    unitCount
  };
}
