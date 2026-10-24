# Manus 整体架构与 Agent Loop 对比

这是一个单文件、零依赖的交互式 HTML explainer，基于 Manus 官方公开文档、博客与 ReAct 原论文整理。

## 内容

- Manus 整体能力与数据流架构：入口、Agent Loop、工具、Sandbox、文件系统上下文、并行 Agent 与交付。
- Agent Loop 与传统 ReAct 的对比：循环结构、显式推理、上下文、工具约束、执行环境、错误恢复和并行扩展。
- 证据边界：区分官方明确能力、结构推断和未公开内部实现。
- 端侧 Agent Runtime 与端云协同：沙箱、三层记忆、长任务恢复、通信总线、Placement & Task Dispatcher、Local-first / Cloud-first / Hybrid。
- 端侧沙箱与 Capability Broker 详细伪代码：能力策略、短时令牌、沙箱创建、网络/路径约束、审计、端云 handoff 和可恢复执行。
- 分级记忆与长时间任务伪代码：Canonical Event Log、Reducer、Checkpoint、MemoryRecord、本地向量检索、压缩淘汰、断点恢复、调度和端云同步。

## 使用

直接打开 [`index.html`](./index.html) 即可离线查看，无需构建、后端或外部依赖。

## 资料来源

- [Context Engineering for AI Agents: Lessons from Building Manus](https://manus.im/blog/Context-Engineering-for-AI-Agents-Lessons-from-Building-Manus)
- [Understanding Manus sandbox - your cloud computer](https://manus.im/blog/manus-sandbox)
- [Manus AI Embraces Open Standards: Integrating Agent Skills](https://manus.im/blog/manus-skills)
- [Introducing Wide Research](https://manus.im/blog/introducing-wide-research)
- [ReAct: Synergizing Reasoning and Acting in Language Models](https://arxiv.org/abs/2210.03629)
- [Google Research: ReAct](https://research.google/blog/react-synergizing-reasoning-and-acting-in-language-models)
- [Google ADK Agent Runtime](https://google.github.io/adk-docs/runtime/)
- [Google ADK Event Loop](https://google.github.io/adk-docs/runtime/event-loop/)
- [Google ADK MemoryService](https://google.github.io/adk-docs/sessions/memory/)
- [Google ADK Artifacts](https://google.github.io/adk-docs/artifacts/)
- [Google ADK A2A](https://google.github.io/adk-docs/a2a/intro/)

> 本项目是公开资料推演版，不代表 Manus 内部私有微服务、模型路由、数据库或基础设施拓扑。
