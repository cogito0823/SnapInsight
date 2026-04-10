from __future__ import annotations

import unittest

from app.services.explanation_service import ExplanationService


class ExplanationServicePromptTests(unittest.TestCase):
    def test_short_prompt_is_chinese_first_and_concise(self) -> None:
        service = ExplanationService(None)  # type: ignore[arg-type]
        prompt = service._build_prompt("Transformer", "short")

        self.assertIn("请用中文优先解释用户选中的概念", prompt)
        self.assertIn("尽量控制在120字以内", prompt)
        self.assertIn("待解释文本：Transformer", prompt)


if __name__ == "__main__":
    unittest.main()
