"""医疗 Agent：LangGraph StateGraph，router -> retrieve -> generate。

流式通过自定义回调（on_event）逐 token 下发，由 chat 路由聚合为 SSE。
"""
from langchain_core.messages import AIMessage, SystemMessage
from langchain_deepseek import ChatDeepSeek
from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.config import get_settings
from app.graph.state import AgentState
from app.rag import vectorstore

settings = get_settings()

SYSTEM_PROMPT = """你是一个专业的医疗健康助手（Medical Agent）。

回答要求：
1. 优先依据下面提供的「医学知识库参考资料」回答；资料不足时基于你的医学知识回答，并明确说明。
2. 回答使用中文（除非用户使用其他语言提问），条理清晰，必要时使用 Markdown 列表/小标题。
3. 涉及用药、剂量、诊断等专业内容时保持严谨，并提示"具体诊疗请咨询医生"。
4. 不做绝对化的医疗承诺，遇到急症（如胸痛、呼吸困难、意识不清等）建议立即就医。

医学知识库参考资料：
{context}"""

NO_RAG_PROMPT = """你是一个专业的医疗健康助手（Medical Agent）。
回答使用中文（除非用户使用其他语言提问），条理清晰，可用 Markdown 组织内容。
涉及用药、剂量、诊断等专业内容时保持严谨，并提示"具体诊疗请咨询医生"。
遇到急症（如胸痛、呼吸困难、意识不清等）建议立即就医。"""

# 简单启发式：医疗领域词或疑问句倾向检索
MEDICAL_HINTS = (
    "病", "症", "药", "医", "治疗", "诊断", "症状", "炎症", "糖尿", "血压", "肿瘤",
    "癌", "感染", "疫苗", "剂量", "用法", "复查", "检查", "发热", "咳嗽", "头痛",
    "disease", "symptom", "treatment", "diagnosis", "drug", "therapy", "medicine", "diabetes",
)


def _make_llm(deep_think: bool) -> ChatDeepSeek:
    return ChatDeepSeek(
        model=settings.reasoner_model if deep_think else settings.chat_model,
        api_key=settings.deepseek_api_key,
        api_base=settings.deepseek_base_url,
        streaming=True,
        temperature=0.3 if not deep_think else 1.0,
        max_retries=2,
    )


class MedicalAgent:
    def __init__(self):
        self.graph = self._build()

    # ---- 节点 ----

    def router(self, state: AgentState) -> dict:
        """判断是否需要检索医学知识库。"""
        question = state["question"]
        need = any(h in question.lower() for h in MEDICAL_HINTS) or "?" in question or "？" in question
        return {"need_retrieval": need}

    def retrieve(self, state: AgentState) -> dict:
        question = state["question"]
        try:
            hits = vectorstore.search(question)
        except Exception:
            hits = []
        citations = [
            {
                "chunk_id": h["id"],
                "document_id": h["document_id"],
                "title": h["title"],
                "source": h["source_name"],
                "url": h["source_url"],
                "score": round(float(h["score"]), 4),
                "snippet": h["chunk_text"][:200],
            }
            for h in hits
        ]
        context = "\n\n".join(
            f"【资料{i+1}】(来源: {h['title']} - {h['source_name']})\n{h['chunk_text']}"
            for i, h in enumerate(hits)
        )
        return {"citations": citations, "context": context}

    def generate(self, state: AgentState) -> dict:
        return {}  # 生成在流式路径中处理（见 chat 路由），这里仅作图完整性占位

    def _build(self) -> CompiledStateGraph:
        g = StateGraph(AgentState)
        g.add_node("router", self.router)
        g.add_node("retrieve", self.retrieve)
        g.add_node("generate", self.generate)
        g.add_edge(START, "router")
        g.add_conditional_edges(
            "router",
            lambda s: "retrieve" if s.get("need_retrieval") else "generate",
        )
        g.add_edge("retrieve", "generate")
        g.add_edge("generate", END)
        return g.compile()


agent = MedicalAgent()


def build_answer_messages(state: AgentState, history: list) -> list:
    """构造最终发给 LLM 的消息列表（含 RAG 上下文与历史）。"""
    if state.get("need_retrieval") and state.get("context"):
        system = SystemMessage(content=SYSTEM_PROMPT.format(context=state["context"]))
    else:
        system = SystemMessage(content=NO_RAG_PROMPT)
    return [system] + history
