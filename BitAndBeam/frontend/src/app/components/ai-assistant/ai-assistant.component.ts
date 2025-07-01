import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MarkdownBoldPipe } from '../../pipes/markdown-bold.pipe';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';
import { ApiClientFactory } from '../../services/api-client.factory';
import { OllamaApi, OllamaRequest } from '../../../api';

interface ChatMessage {
  text: string;
  sender: 'user' | 'assistant';
  timestamp?: Date;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule, 
    MarkdownBoldPipe
  ],
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css']
})
export class AiAssistantComponent implements OnInit, OnDestroy {
  @Input() globalMode: boolean = false; // Whether this is the global floating widget
  
  messages: ChatMessage[] = [];
  userInput = '';
  errorMessage = '';
  showChatInterface = false; // Start closed in global mode
  isProcessing = false;
  isDarkMode = false;
  
  private themeSubscription: Subscription | null = null;
  private ollamaApi: OllamaApi;
  
  constructor(
    private themeService: ThemeService,
    private apiClientFactory: ApiClientFactory
  ) {
    this.ollamaApi = this.apiClientFactory.create<OllamaApi>(OllamaApi);
  }

  ngOnInit(): void {
    this.themeSubscription = this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
    
    // Initialize with current theme state
    this.isDarkMode = this.themeService.isDarkMode();

    // Always start with chat interface hidden after page load/reload/redirect
    this.showChatInterface = false;
    
    // Load FontAwesome if not already loaded
    this.loadFontAwesome();
  }
  
  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  // Show the chat interface
  showChat(): void {
    this.showChatInterface = true;
  }

  // Hide the chat interface
  hideChat(): void {
    this.showChatInterface = false;
  }

  // Toggle chat visibility
  toggleChat(): void {
    this.showChatInterface = !this.showChatInterface;
  }
  
  // Load FontAwesome icons for the chat interface
  private loadFontAwesome(): void {
    if (!document.getElementById('font-awesome-css')) {
      const link = document.createElement('link');
      link.id = 'font-awesome-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
      document.head.appendChild(link);
    }
  }

  sendMessage(): void {
    const userMessage = this.userInput.trim();
    if (!userMessage || this.isProcessing) {
      return;
    }

    // Add user message to chat
    this.messages.push({
      text: userMessage,
      sender: 'user',
      timestamp: new Date()
    });

    this.userInput = '';
    this.errorMessage = '';
    this.isProcessing = true;

    // Prepare the previous messages for context if needed
    const previousMessages = this.messages
      .slice(-10) // Get last 10 messages for context
      .map(msg => ({ role: msg.sender, content: msg.text }));

    // Create Ollama request
    const ollamaRequest: OllamaRequest = {
      prompt: userMessage,
      context: { 
        conversation: previousMessages
      }
    };

    // Send to Ollama API
    this.ollamaApi.apiOllamaAskPost(ollamaRequest)
      .then(response => {
        const responseData = response as any;
        if (responseData && responseData.data && responseData.data.response) {
          this.messages.push({
            text: responseData.data.response,
            sender: 'assistant',
            timestamp: new Date()
          });
        } else {
          this.handleError('Received an empty response from the AI');
        }
        this.isProcessing = false;
      })
      .catch(error => {
        console.error('Error calling Ollama API:', error);
        this.handleError('Failed to get a response from the AI assistant');
        this.isProcessing = false;
      });
  }

  handleError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }
}
