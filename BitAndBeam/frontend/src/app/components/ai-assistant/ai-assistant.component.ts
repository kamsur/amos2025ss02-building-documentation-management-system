import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MarkdownBoldPipe } from '../../pipes/markdown-bold.pipe';
import { environment } from '../../../environments/environment';
import { ThemeService } from '../../services/theme.service';
import { Subscription } from 'rxjs';

interface ChatMessage {
  text: string;
  sender: 'user' | 'assistant';
  timestamp?: Date;
}

@Component({
  selector: 'app-ai-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, MarkdownBoldPipe],
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css']
})
export class AiAssistantComponent implements OnInit, OnDestroy {
  messages: ChatMessage[] = [];
  userInput = '';
  errorMessage = '';
  showHistory = false;
  isProcessing = false;
  isDarkMode = false;
  
  private themeSubscription: Subscription | null = null;

  constructor(
    private http: HttpClient,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
    });
    
    // Initialize with current theme state
    this.isDarkMode = this.themeService.isDarkMode();
    
    // Load chat history from local storage if available
    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) {
      try {
        this.messages = JSON.parse(savedHistory);
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
  }
  
  ngOnDestroy(): void {
    // Clean up subscription
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  toggleHistory(): void {
    this.showHistory = !this.showHistory;
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

    // Save history to local storage
    this.saveHistory();

    // Send to backend
    this.http.post<any>(`${environment.apiUrl}/api/chat`, { message: userMessage })
      .subscribe({
        next: (response) => {
          if (response && response.message) {
            this.messages.push({
              text: response.message,
              sender: 'assistant',
              timestamp: new Date()
            });
          } else {
            this.handleError('Received an empty response from the AI');
          }
          this.isProcessing = false;
          this.saveHistory();
        },
        error: (error) => {
          console.error('Error calling AI assistant:', error);
          this.handleError('Failed to get a response from the AI assistant');
          this.isProcessing = false;
        }
      });
  }

  private handleError(message: string): void {
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 5000);
  }

  private saveHistory(): void {
    // Keep only the last 50 messages to manage storage size
    const historyToSave = this.messages.slice(-50);
    localStorage.setItem('chatHistory', JSON.stringify(historyToSave));
  }
}
