from typing import Annotated

from langgraph.graph import add_messages
from typing_extensions import TypedDict


class AgentState(TypedDict, total=False):
    # 对话历史（LangChain 消息对象）
    messages: Annotated[list, add_messages]
    # 用户当前问题
    question: str
    # 是否开启深度思考（deepseek-reasoner）
    deep_think: bool
    # 是否需要检索医学知识库
    need_retrieval: bool
    # 检索到的引用
    citations: list
    # 检索片段拼接的上下文
    context: str
