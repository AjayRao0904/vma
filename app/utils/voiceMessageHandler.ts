export interface VoiceMessage {
  id: string;
  audioBlob: Blob;
  duration: number; // in seconds
  timestamp: Date;
  transcription?: string;
  waveformData?: number[]; // for visualization
}

export class VoiceMessageHandler {
  private static instance: VoiceMessageHandler;
  private voiceMessages: Map<string, VoiceMessage> = new Map();

  private constructor() {}

  static getInstance(): VoiceMessageHandler {
    if (!VoiceMessageHandler.instance) {
      VoiceMessageHandler.instance = new VoiceMessageHandler();
    }
    return VoiceMessageHandler.instance;
  }

  // Save a voice recording
  saveVoiceMessage(audioBlob: Blob, duration: number): string {
    const id = this.generateId();
    const voiceMessage: VoiceMessage = {
      id,
      audioBlob,
      duration,
      timestamp: new Date(),
    };

    this.voiceMessages.set(id, voiceMessage);
    
    // Store in localStorage for persistence
    this.persistToStorage();
    
    return id;
  }

  // Get a voice message by ID
  getVoiceMessage(id: string): VoiceMessage | undefined {
    return this.voiceMessages.get(id);
  }

  // Get all voice messages
  getAllVoiceMessages(): VoiceMessage[] {
    return Array.from(this.voiceMessages.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  }

  // Delete a voice message
  deleteVoiceMessage(id: string): boolean {
    const deleted = this.voiceMessages.delete(id);
    if (deleted) {
      this.persistToStorage();
    }
    return deleted;
  }

  // Convert audio blob to URL for playback
  createAudioURL(audioBlob: Blob): string {
    return URL.createObjectURL(audioBlob);
  }

  // Clean up audio URL
  revokeAudioURL(url: string): void {
    URL.revokeObjectURL(url);
  }

  // Convert audio blob to base64 for storage/transmission
  async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:audio/webm;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Convert base64 back to blob
  base64ToBlob(base64: string, mimeType: string = 'audio/webm'): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Generate waveform data for visualization
  async generateWaveformData(audioBlob: Blob): Promise<number[]> {
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const samples = 100; // Number of samples for waveform
      const blockSize = Math.floor(channelData.length / samples);
      const waveformData: number[] = [];

      for (let i = 0; i < samples; i++) {
        const start = i * blockSize;
        const end = start + blockSize;
        let sum = 0;

        for (let j = start; j < end && j < channelData.length; j++) {
          sum += Math.abs(channelData[j]);
        }

        waveformData.push(sum / blockSize);
      }

      await audioContext.close();
      return waveformData;
    } catch (error) {
      console.error('Error generating waveform data:', error);
      return [];
    }
  }

  // Update voice message with additional data
  async updateVoiceMessage(id: string, updates: Partial<VoiceMessage>): Promise<boolean> {
    const voiceMessage = this.voiceMessages.get(id);
    if (!voiceMessage) return false;

    const updatedMessage = { ...voiceMessage, ...updates };
    this.voiceMessages.set(id, updatedMessage);
    this.persistToStorage();
    
    return true;
  }

  // Send voice message to backend (placeholder for actual API call)
  async sendVoiceMessage(id: string): Promise<boolean> {
    const voiceMessage = this.voiceMessages.get(id);
    if (!voiceMessage) return false;

    try {
      // Convert blob to base64 for transmission
      const base64Audio = await this.blobToBase64(voiceMessage.audioBlob);
      
      // Placeholder API call
      console.log('Sending voice message to backend:', {
        id,
        duration: voiceMessage.duration,
        timestamp: voiceMessage.timestamp,
        audioData: base64Audio.substring(0, 50) + '...', // Log first 50 chars
      });

      // TODO: Replace with actual API call
      // const response = await fetch('/api/voice-messages', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     id,
      //     audioData: base64Audio,
      //     duration: voiceMessage.duration,
      //     timestamp: voiceMessage.timestamp.toISOString(),
      //   }),
      // });

      // return response.ok;
      
      return true; // Simulate success for now
    } catch (error) {
      console.error('Error sending voice message:', error);
      return false;
    }
  }

  // Private helper methods
  private generateId(): string {
    return `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistToStorage(): void {
    try {
      const serializedMessages: any[] = [];
      
      // Convert voice messages to serializable format
      this.voiceMessages.forEach(async (message, id) => {
        const base64Audio = await this.blobToBase64(message.audioBlob);
        serializedMessages.push({
          id,
          audioData: base64Audio,
          duration: message.duration,
          timestamp: message.timestamp.toISOString(),
          transcription: message.transcription,
          waveformData: message.waveformData,
        });
      });

      localStorage.setItem('voiceMessages', JSON.stringify(serializedMessages));
    } catch (error) {
      console.error('Error persisting voice messages:', error);
    }
  }

  // Load from localStorage on initialization
  async loadFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem('voiceMessages');
      if (!stored) return;

      const serializedMessages = JSON.parse(stored);
      
      for (const serialized of serializedMessages) {
        const audioBlob = this.base64ToBlob(serialized.audioData);
        const voiceMessage: VoiceMessage = {
          id: serialized.id,
          audioBlob,
          duration: serialized.duration,
          timestamp: new Date(serialized.timestamp),
          transcription: serialized.transcription,
          waveformData: serialized.waveformData,
        };
        
        this.voiceMessages.set(serialized.id, voiceMessage);
      }
    } catch (error) {
      console.error('Error loading voice messages from storage:', error);
    }
  }

  // Clear all voice messages
  clearAllVoiceMessages(): void {
    this.voiceMessages.clear();
    localStorage.removeItem('voiceMessages');
  }
}

// Export singleton instance
export const voiceMessageHandler = VoiceMessageHandler.getInstance();