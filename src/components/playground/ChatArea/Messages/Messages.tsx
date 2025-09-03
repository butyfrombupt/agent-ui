import type { PlaygroundChatMessage } from '@/types/playground'

import { AgentMessage, UserMessage } from './MessageItem'
import Tooltip from '@/components/ui/tooltip'
import { memo, useState } from 'react'
import {
  ToolCallProps,
  ReasoningStepProps,
  ReasoningProps,
  ReferenceData,
  Reference
} from '@/types/playground'
import React, { type FC, type JSX } from 'react'
import ChatBlankState from './ChatBlankState'
import Icon from '@/components/ui/icon'

// Unicode解码函数
const decodeUnicodeString = (str: string): string => {
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (match, code) => {
      return String.fromCharCode(parseInt(code, 16));
    });
  } catch (error) {
    return str; // 如果解码失败，返回原字符串
  }
};

// 新增：ToolsCompletionCard组件实现
const ToolsResult: FC<{ result: any }> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (result === null || result === undefined) {
    return <span className="text-primary/50">无结果</span>;
  }
  
  let resultStr: string;
  if (typeof result === 'string') {
    resultStr = result;
  } else {
    try {
      resultStr = JSON.stringify(result, null, 2);
    } catch {
      resultStr = String(result);
    }
  }
  
  const isLongResult = resultStr.length > 200;
  
  return (
    <div className="font-mono text-xs break-words overflow-wrap-anywhere">
      <div className="text-primary/70 font-medium mb-1">执行结果:</div>
      {isLongResult ? (
        <div>
          <pre className="text-primary/90 whitespace-pre-wrap select-text">
            {isExpanded ? resultStr : `${resultStr.substring(0, 200)}...`}
          </pre>
          <button 
            className="mt-1 text-xs text-primary/50 hover:text-primary/80"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
      ) : (
        <pre className="text-primary/90 whitespace-pre-wrap select-text">{resultStr}</pre>
      )}
    </div>
  );
};

const ToolsCompletionCard: FC<ToolsCompletionCardProps> = ({ tools }) => {

  return (
    <>
      {tools.map((tool, index) => {
        // 只显示atransfer_task_to_member工具的result内容
        if (tool.tool_name !== 'transfer_task_to_member') {
          return null;
        }
        if (tool.tool_name == 'transfer_task_to_member' && tool.result == undefined && tool.result == null) {
          return null;
        }
        const memberId = tool.tool_args.member_id || ''

        
        return (
          <div key={`${tool.tool_call_id}-${index}`} className="cursor-default rounded-lg bg-accent px-3 py-2 text-xs max-w-2xl w-full overflow-hidden">
            <p className="font-dmmono uppercase text-primary/80 mb-1">
              <span className="text-primary/90">{memberId}</span>
            </p>
            
            {tool.result !== undefined && tool.result !== null && <ToolsResult result={tool.result} />}
          </div>
        );
      })}
    </>
  );
}

interface MessageListProps {
  messages: PlaygroundChatMessage[]
}

interface MessageWrapperProps {
  message: PlaygroundChatMessage
  isLastMessage: boolean
}

interface ReferenceProps {
  references: ReferenceData[]
}

interface ReferenceItemProps {
  reference: Reference
}

const ReferenceItem: FC<ReferenceItemProps> = ({ reference }) => (
  <div className="relative flex h-[63px] w-[190px] cursor-default flex-col justify-between overflow-hidden rounded-md bg-background-secondary p-3 transition-colors hover:bg-background-secondary/80">
    <p className="text-sm font-medium text-primary">{reference.name}</p>
    <p className="truncate text-xs text-primary/40">{reference.content}</p>
  </div>
)

const References: FC<ReferenceProps> = ({ references }) => (
  <div className="flex flex-col gap-4">
    {references.map((referenceData, index) => (
      <div
        key={`${referenceData.query}-${index}`}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap gap-3">
          {referenceData.references.map((reference, refIndex) => (
            <ReferenceItem
              key={`${reference.name}-${reference.meta_data.chunk}-${refIndex}`}
              reference={reference}
            />
          ))}
        </div>
      </div>
    ))}
  </div>
)

// 统一卡片类型定义
type UnifiedCardType = 'tool_call' | 'member_response' | 'tools_completion'

interface UnifiedCard {
  id: string
  type: UnifiedCardType
  created_at: number
  data: any
}

// 统一卡片组件
const UnifiedCard: FC<{ card: UnifiedCard }> = ({ card }) => {
  const getCardIcon = () => (
    <Icon
      type="hammer"
      className="rounded-lg bg-background-secondary p-1"
      size="sm"
      color="secondary"
    />
  )

  const getCardTitle = () => {
    switch (card.type) {
      case 'tool_call':
        return 'Tool Calls'
      case 'member_response':
        return 'Member Tool Calls'
      case 'tools_completion':
        return 'Tools Completion'
      default:
        return 'Unknown'
    }
  }

  const renderCardContent = () => {
    switch (card.type) {
      case 'tool_call':
        return (
          <ToolComponent
            key={card.data.tool_call_id || `${card.data.tool_name}-${card.data.created_at}`}
            tools={card.data}
          />
        )
      case 'member_response':
        return (
          <MemberResponseToolsDisplay memberResponses={[card.data]} />
        )
      case 'tools_completion':
        return (
          <ToolsCompletionCard tools={[card.data]} />
        )
      default:
        return null
    }
  }

  return (
    <div className="flex items-start gap-3">
      <Tooltip
        delayDuration={0}
        content={<p className="text-accent">{getCardTitle()}</p>}
        side="top"
      >
        {getCardIcon()}
      </Tooltip>
      <div className="flex flex-wrap gap-2">
        {renderCardContent()}
      </div>
    </div>
  )
}

const AgentMessageWrapper = ({ message }: MessageWrapperProps) => {
  // 创建统一的卡片数组
  const createUnifiedCards = (): UnifiedCard[] => {
    const cards: UnifiedCard[] = []

    // 添加 tool_calls (分配任务)
    if (message.tool_calls && message.tool_calls.length > 0) {
      message.tool_calls.forEach((toolCall, index) => {
        cards.push({
          id: toolCall.tool_call_id || `tool-call-${message.created_at}-${index}`,
          type: 'tool_call',
          created_at: message.created_at,
          data: toolCall
        })
      })
    }

    // 添加 member_responses (工具调用)
    if (message.member_responses && message.member_responses.length > 0) {
      message.member_responses.forEach((memberResponse, index) => {
        cards.push({
          id: `member-response-${message.created_at}-${index}`,
          type: 'member_response',
          created_at: message.created_at,
          data: memberResponse
        })
      })
    }

    // 添加 tools (执行结果)
    if (message.tool_calls && message.tool_calls.length > 0) {
      message.tool_calls.forEach((tool, index) => {
        if (tool.tool_name == 'transfer_task_to_member') {
        cards.push({
          id: `tools-completion-${tool.tool_call_id || index}`,
          type: 'tools_completion',
          created_at: message.created_at,
          data: tool
        })
      }
      })
    }
    // 按创建时间排序，确保正确的时间顺序
    return cards.sort((a, b) => a.created_at - b.created_at)
  }

  const unifiedCards = createUnifiedCards()

  return (
    <div className="flex flex-col gap-y-9">
      {message.extra_data?.reasoning_steps &&
        message.extra_data.reasoning_steps.length > 0 && (
          <div className="flex items-start gap-4">
            <Tooltip
              delayDuration={0}
              content={<p className="text-accent">Reasoning</p>}
              side="top"
            >
              <Icon type="reasoning" size="sm" />
            </Tooltip>
            <div className="flex flex-col gap-3">
              <p className="text-xs uppercase">Reasoning</p>
              <Reasonings reasoning={message.extra_data.reasoning_steps} />
            </div>
          </div>
        )}
      {message.extra_data?.references &&
        message.extra_data.references.length > 0 && (
          <div className="flex items-start gap-4">
            <Tooltip
              delayDuration={0}
              content={<p className="text-accent">References</p>}
              side="top"
            >
              <Icon type="references" size="sm" />
            </Tooltip>
            <div className="flex flex-col gap-3">
              <References references={message.extra_data.references} />
            </div>
          </div>
        )}
      {/* 统一的卡片展示 */}
      {unifiedCards.map((card) => (
        <UnifiedCard key={card.id} card={card} />
      ))}
      <AgentMessage message={message} />
    </div>
  )
}
const Reasoning: FC<ReasoningStepProps> = ({ index, stepTitle }) => (
  <div className="flex items-center gap-2 text-secondary">
    <div className="flex h-[20px] items-center rounded-md bg-background-secondary p-2">
      <p className="text-xs">STEP {index + 1}</p>
    </div>
    <p className="text-xs">{stepTitle}</p>
  </div>
)
const Reasonings: FC<ReasoningProps> = ({ reasoning }) => (
  <div className="flex flex-col items-start justify-center gap-2">
    {reasoning.map((title, index) => (
      <Reasoning
        key={`${title.title}-${title.action}-${index}`}
        stepTitle={title.title}
        index={index}
      />
    ))}
  </div>
)

// 新增：处理ToolCallCompleted事件中member_responses的tools字段显示
interface MemberResponseToolsDisplayProps {
  memberResponses: Array<{
    content?: string
    agent_name?: string
    tools?: Array<{
      tool_call_id: string
      tool_name: string
      tool_args: Record<string, any>
      result: any
      tool_call_error: boolean
    }>
  }>
}

// 新增：处理ToolCallCompleted事件中tools字段的显示
interface ToolsCompletionCardProps {
  tools: Array<{
    tool_call_id: string
    tool_name: string
    tool_args: Record<string, any>
    result: any
    tool_call_error: boolean
  }>
}

const MemberToolArgItem: FC<{ argKey: string; value: any; depth?: number }> = ({ argKey, value, depth = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isObject = value && typeof value === 'object' && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const valueStr = isObject || isArray ? JSON.stringify(value, null, 2) : String(value);
  const isLongValue = valueStr.length > 50;
  const indentClass = depth > 0 ? 'ml-4' : '';
  
  if (isObject && Object.keys(value).length > 0) {
    return (
      <div className={`${indentClass}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-primary/70 font-medium">{argKey}:</span>
          <button 
            className="text-xs text-primary/50 hover:text-primary/80"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
        {isExpanded && (
          <div className="ml-4 space-y-1 border-l border-primary/20 pl-3">
            {Object.entries(value).map(([key, val]) => (
              <MemberToolArgItem key={key} argKey={key} value={val} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`flex items-start gap-2 ${indentClass}`}>
      <span className="text-primary/70 font-medium min-w-0">{argKey}:</span>
      {isLongValue ? (
        <div className="flex-1">
          <span 
            className="text-primary/90 cursor-pointer border-b border-dotted border-primary/40 select-text"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? valueStr : `${valueStr.substring(0, 50)}...`}
          </span>
          <button 
            className="ml-1 text-xs text-primary/50 hover:text-primary/80"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
      ) : (
        <span className="text-primary/90 flex-1 select-text">{valueStr}</span>
      )}
    </div>
  );
};

const MemberToolResult: FC<{ result: any }> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (result === null || result === undefined) return <span className="text-primary/50">无返回数据</span>;
  
  let resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  // 解码Unicode字符
  resultStr = decodeUnicodeString(resultStr);
  const isLongResult = resultStr.length > 100;
  
  return (
    <div className="mt-2 p-2 bg-background-secondary rounded border">
      <div className="text-xs text-primary/70 font-medium mb-1 flex items-center gap-2">
        返回结果:
        {isLongResult && (
          <button 
            className="text-xs text-primary/50 hover:text-primary/80"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        )}
      </div>
      {isLongResult ? (
        <div className="text-xs text-primary/90 whitespace-pre-wrap select-text">
          {isExpanded ? resultStr : `${resultStr.substring(0, 100)}...`}
        </div>
      ) : (
        <div className="text-xs text-primary/90 whitespace-pre-wrap select-text">{resultStr}</div>
      )}
    </div>
  );
};

// 格式化工具返回结果组件（独立组件以避免Hooks规则问题）
const ToolResultDisplay: FC<{ result: any }> = ({ result }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (result === null || result === undefined) return <span className="text-primary/50">无返回数据</span>;
  
  let resultStr = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  // 解码Unicode字符
  resultStr = decodeUnicodeString(resultStr);
  const isLongResult = resultStr.length > 100;
  
  return (
    <div className="mt-2 p-2 bg-background-secondary rounded border">
      <div className="text-xs text-primary/70 font-medium mb-1 flex items-center gap-2">
        返回结果:
        {isLongResult && (
          <button 
            className="text-xs text-primary/50 hover:text-primary/80"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        )}
      </div>
      {isLongResult ? (
        <div className="text-xs text-primary/90 whitespace-pre-wrap select-text">
          {isExpanded ? resultStr : `${resultStr.substring(0, 100)}...`}
        </div>
      ) : (
        <div className="text-xs text-primary/90 whitespace-pre-wrap select-text">{resultStr}</div>
      )}
    </div>
  );
};

const MemberResponseToolsDisplay: FC<MemberResponseToolsDisplayProps> = ({ memberResponses }) => {

  const formatMemberToolArgs = (args: Record<string, any>): JSX.Element => {
    if (!args || typeof args !== 'object') return <span>无参数</span>;
    return (
      <div className="space-y-1">
        {Object.entries(args).map(([key, value]) => (
          <MemberToolArgItem key={key} argKey={key} value={value} />
        ))}
      </div>
    );
  };

  return (
    <>
      {memberResponses.map((response, responseIndex) => (
        response.tools?.map((tool, toolIndex) => {
          return (
            <div key={`${responseIndex}-${toolIndex}`} className="cursor-default rounded-lg bg-accent px-3 py-2 text-xs max-w-2xl w-full overflow-hidden">
              <p className="font-dmmono uppercase text-primary/80 mb-1">
                {response.agent_name} 调用工具：{tool.tool_name}
              </p>
              
              {tool.tool_args && Object.keys(tool.tool_args).length > 0 && (
                <div className="font-mono text-xs break-words mb-2 overflow-wrap-anywhere">
                  <div className="text-primary/70 font-medium mb-1">工具执行参数:</div>
                  {formatMemberToolArgs(tool.tool_args)}
                </div>
              )}
              
              {tool.result !== undefined && <MemberToolResult result={tool.result} />}
            </div>
          )
        }) || []
      ))}
    </>
  )
};

const ToolComponent = memo(({ tools }: ToolCallProps) => {
  // 格式化工具参数为可读格式（可点击展开）
  const formatToolArgs = (args: Record<string, any>): JSX.Element => {
    if (!args || typeof args !== 'object') return <span>无参数</span>;
    
    return (
      <div className="space-y-1">
        {Object.entries(args).map(([key, value]) => {
          const valueStr = String(value);
          const isLongValue = valueStr.length > 50;
          const [isExpanded, setIsExpanded] = useState(false);
          
          return (
            <div key={key} className="flex items-start gap-2">
              <span className="text-primary/70 font-medium min-w-0">{key}:</span>
              {isLongValue ? (
                <div className="flex-1">
                  <span 
                    className="text-primary/90 cursor-pointer border-b border-dotted border-primary/40 select-text"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? valueStr : `${valueStr.substring(0, 50)}...`}
                  </span>
                  <button 
                    className="ml-1 text-xs text-primary/50 hover:text-primary/80"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? '收起' : '展开'}
                  </button>
                </div>
              ) : (
                <span className="text-primary/90 flex-1 select-text">{valueStr}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const formatTransferTaskArgs = (args: Record<string, string>) => {
    const memberId = args.member_id || ''
    const taskDescription = args.task_description || ''
    const expectedOutput = args.expected_output || ''
    
    return (
      <div className="space-y-1">
        <p className="text-primary/70">分配任务给: <span className="text-primary/90">{memberId}</span></p>
        <p className="text-primary/70">工作项: <span className="text-primary/90">{taskDescription}</span></p>
        <p className="text-primary/70">期望返回: <span className="text-primary/90">{expectedOutput}</span></p>
      </div>
    )
  }



  const isTransferTask = tools.tool_name === 'transfer_task_to_member';
  return (
    <div className="cursor-default rounded-lg bg-accent px-3 py-2 text-xs max-w-2xl w-full overflow-hidden">
      <p className="font-dmmono uppercase text-primary/80 mb-1">
        {isTransferTask ? '分配任务' : tools.tool_name}
      </p>
      
      {tools.tool_args && Object.keys(tools.tool_args).length > 0 && (
        <div className="font-mono text-xs break-words mb-2 overflow-wrap-anywhere">
          {isTransferTask ? (
            formatTransferTaskArgs(tools.tool_args)
          ) : (
            <div>
              <div className="text-primary/70 font-medium mb-1">工具执行参数:</div>
              {formatToolArgs(tools.tool_args)}
            </div>
          )}
        </div>
      )}
      
      {!isTransferTask && tools.result !== undefined && <ToolResultDisplay result={tools.result} />}
    </div>
  )
})
ToolComponent.displayName = 'ToolComponent'
const Messages = ({ messages }: MessageListProps) => {
  if (messages.length === 0) {
    return <ChatBlankState />
  }

  return (
    <>
      {messages.map((message, index) => {
        const key = `${message.role}-${message.created_at}-${index}`
        const isLastMessage = index === messages.length - 1

        if (message.role === 'agent') {
          return (
            <AgentMessageWrapper
              key={key}
              message={message}
              isLastMessage={isLastMessage}
            />
          )
        }
        return <UserMessage key={key} message={message} />
      })}
    </>
  )
}

export default Messages
