/**
 * AI Orchestrator Chat Component
 *
 * Interactive chat interface for getting AI-powered optimization guidance.
 * Users can ask questions about failed optimizations and get suggestions.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Collapse,
  List,
  ListItem,
  ListItemText,
  Divider,
  Card,
  CardContent,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  Psychology as PsychologyIcon,
} from '@mui/icons-material';
import { useDataProvider, useNotify } from 'react-admin';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: Suggestion[];
  reasoning?: string;
}

interface Suggestion {
  priority: number;
  constraint_to_relax: string;
  relaxation_strategy: string;
  description: string;
  expected_impact: string;
  risk_level: 'low' | 'medium' | 'high';
  implementation_code?: string;
}

interface OptimizerAIChatProps {
  planningId: number;
  month: number;
  year: number;
  failureMessage?: string;
  onClose?: () => void;
}

const API_BASE_URL = import.meta.env.VITE_SIMPLE_REST_URL || 'http://localhost:8000';
const AI_ORCHESTRATOR_URL = import.meta.env.VITE_AI_ORCHESTRATOR_URL || 'https://nunoollama.opefitoo.com';
const AI_ORCHESTRATOR_API_KEY = import.meta.env.VITE_AI_ORCHESTRATOR_API_KEY || '';

export const OptimizerAIChat: React.FC<OptimizerAIChatProps> = ({
  planningId,
  month,
  year,
  failureMessage,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const notify = useNotify();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    const greeting: Message = {
      id: '0',
      role: 'assistant',
      content: `👋 Bonjour! Je suis votre assistant IA pour l'optimisation du planning ${month}/${year}.\n\n${
        failureMessage
          ? `J'ai détecté un échec d'optimisation: "${failureMessage}"\n\nJe peux vous aider à comprendre pourquoi et suggérer des solutions. Que voulez-vous savoir?`
          : `Je peux vous aider à analyser et optimiser ce planning. Posez-moi des questions sur les contraintes, la disponibilité des employés, ou demandez-moi d'analyser le planning actuel.`
      }`,
      timestamp: new Date(),
    };
    setMessages([greeting]);
  }, [month, year, failureMessage]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Detect intent from user message
      const lowerInput = input.toLowerCase();

      if (lowerInput.includes('analys') || lowerInput.includes('pourquoi') || lowerInput.includes('problème')) {
        // Full analysis request
        await performFullAnalysis(userMessage);
      } else if (lowerInput.includes('suggestion') || lowerInput.includes('fix') || lowerInput.includes('résoudre')) {
        // Quick advice request
        await getQuickAdvice(userMessage);
      } else {
        // General question - use quick advice
        await getQuickAdvice(userMessage);
      }
    } catch (error: any) {
      notify(`Erreur: ${error.message}`, { type: 'error' });

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Désolé, une erreur s'est produite: ${error.message}\n\nAssurez-vous que le service AI Orchestrator est en cours d'exécution (${AI_ORCHESTRATOR_URL})`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const performFullAnalysis = async (userMessage: Message) => {
    // Call Django backend to get diagnostics and forward to AI orchestrator
    const response = await fetch(`${API_BASE_URL}/planning/${planningId}/ai-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_question: userMessage.content,
        failure_message: failureMessage,
      }),
    });

    if (!response.ok) {
      throw new Error(`Échec de l'analyse (${response.status})`);
    }

    const data = await response.json();

    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `📊 **Analyse Complète**\n\n**Cause Racine:**\n${data.root_cause_summary}\n\n**Problèmes Critiques:**\n${data.critical_issues.map((issue: string) => `• ${issue}`).join('\n')}`,
      timestamp: new Date(),
      suggestions: data.relaxation_suggestions,
      reasoning: data.reasoning_trace,
    };

    setMessages((prev) => [...prev, assistantMessage]);
  };

  const getQuickAdvice = async (userMessage: Message) => {
    // Quick advice endpoint - faster response
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if configured
    if (AI_ORCHESTRATOR_API_KEY) {
      headers['X-API-Key'] = AI_ORCHESTRATOR_API_KEY;
    }

    const response = await fetch(`${AI_ORCHESTRATOR_URL}/quick-advice`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        failure_message: failureMessage || userMessage.content,
        strategies_attempted: ['Full constraints', 'Relaxed'],
      }),
    });

    if (!response.ok) {
      throw new Error(`Service AI indisponible (${response.status})`);
    }

    const data = await response.json();

    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: `💡 ${data.advice}`,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Paper
      elevation={3}
      sx={{
        height: '600px',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon />
          <Typography variant="h6">Assistant IA - Optimisation Planning</Typography>
        </Box>
        {onClose && (
          <IconButton size="small" onClick={onClose} sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          backgroundColor: '#f5f5f5',
        }}
      >
        {messages.map((message) => (
          <Box
            key={message.id}
            sx={{
              display: 'flex',
              justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
              mb: 2,
            }}
          >
            <Box
              sx={{
                maxWidth: '80%',
                display: 'flex',
                gap: 1,
                flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {/* Avatar */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: message.role === 'user' ? '#667eea' : '#764ba2',
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                {message.role === 'user' ? <PersonIcon /> : <AIIcon />}
              </Box>

              {/* Message Content */}
              <Box>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    backgroundColor: message.role === 'user' ? '#667eea' : 'white',
                    color: message.role === 'user' ? 'white' : 'black',
                    borderRadius: 2,
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  >
                    {message.content}
                  </Typography>

                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                        💡 Suggestions de Relaxation (par priorité):
                      </Typography>
                      {message.suggestions.map((suggestion, index) => (
                        <Card key={index} sx={{ mb: 1 }}>
                          <CardContent>
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                              }}
                              onClick={() =>
                                setExpandedSuggestion(
                                  expandedSuggestion === index ? null : index
                                )
                              }
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={`#${suggestion.priority}`}
                                  size="small"
                                  color="primary"
                                />
                                <Typography variant="body2" fontWeight="bold">
                                  {suggestion.constraint_to_relax}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  label={suggestion.risk_level}
                                  size="small"
                                  color={getRiskColor(suggestion.risk_level) as any}
                                />
                                <IconButton size="small">
                                  {expandedSuggestion === index ? (
                                    <ExpandLessIcon />
                                  ) : (
                                    <ExpandMoreIcon />
                                  )}
                                </IconButton>
                              </Box>
                            </Box>

                            <Collapse in={expandedSuggestion === index}>
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                  <strong>Stratégie:</strong> {suggestion.relaxation_strategy}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                  <strong>Description:</strong> {suggestion.description}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                  <strong>Impact Attendu:</strong> {suggestion.expected_impact}
                                </Typography>
                                {suggestion.implementation_code && (
                                  <Alert severity="info" sx={{ mt: 1 }}>
                                    <Typography variant="caption" component="pre">
                                      {suggestion.implementation_code}
                                    </Typography>
                                  </Alert>
                                )}
                              </Box>
                            </Collapse>
                          </CardContent>
                        </Card>
                      ))}
                    </Box>
                  )}

                  {/* Reasoning Trace */}
                  {message.reasoning && (
                    <Box sx={{ mt: 2 }}>
                      <Collapse in={expandedSuggestion === -1}>
                        <Alert severity="info" icon={<PsychologyIcon />}>
                          <Typography variant="caption" sx={{ whiteSpace: 'pre-wrap' }}>
                            <strong>🤔 Raisonnement LLM:</strong>
                            {'\n'}
                            {message.reasoning}
                          </Typography>
                        </Alert>
                      </Collapse>
                      <Button
                        size="small"
                        onClick={() =>
                          setExpandedSuggestion(expandedSuggestion === -1 ? null : -1)
                        }
                        sx={{ mt: 1 }}
                      >
                        {expandedSuggestion === -1 ? 'Masquer' : 'Voir le raisonnement'}
                      </Button>
                    </Box>
                  )}
                </Paper>

                {/* Timestamp */}
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                  {message.timestamp.toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}

        {/* Loading indicator */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#764ba2',
                  color: 'white',
                }}
              >
                <AIIcon />
              </Box>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    L'IA réfléchit...
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        <div ref={messagesEndRef} />
      </Box>

      {/* Input Area */}
      <Box sx={{ p: 2, backgroundColor: 'white', borderTop: '1px solid #e0e0e0' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            placeholder="Posez une question sur l'optimisation... (ex: 'Pourquoi l'optimisation échoue?', 'Suggère des solutions')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            variant="outlined"
            size="small"
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            sx={{
              minWidth: '56px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            <SendIcon />
          </Button>
        </Box>

        {/* Quick Actions */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          <Chip
            label="Pourquoi ça échoue?"
            size="small"
            onClick={() => setInput("Pourquoi l'optimisation échoue pour ce planning?")}
            clickable
          />
          <Chip
            label="Suggère des solutions"
            size="small"
            onClick={() => setInput('Quelles solutions suggères-tu pour résoudre ce problème?')}
            clickable
          />
          <Chip
            label="Analyse complète"
            size="small"
            onClick={() => setInput('Fais une analyse complète du planning et donne-moi des recommandations')}
            clickable
          />
        </Box>
      </Box>
    </Paper>
  );
};

export default OptimizerAIChat;
