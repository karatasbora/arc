import numpy as np
from scipy.io import wavfile
from scipy import signal
import os
import pyttsx3

# Configuration
SAMPLE_RATE = 44100
DURATION = 4.0  # seconds

def float_to_int16(data):
    """Converts -1.0 to 1.0 float data to int16."""
    # Clip
    data = np.clip(data, -1.0, 1.0)
    return (data * 32767).astype(np.int16)

def generate_click(duration=0.1, sample_rate=44100):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    noise = np.random.normal(0, 1, len(t))
    envelope = np.exp(-t * 60)
    sos = signal.butter(4, [1500, 4000], 'bandpass', fs=sample_rate, output='sos')
    filtered = signal.sosfilt(sos, noise)
    click = filtered * envelope
    if np.max(np.abs(click)) > 0:
        click = click / np.max(np.abs(click))
    return click

def generate_shimmer(duration=1.2, sample_rate=44100):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    f_start = 440
    f_end = 880 * 2
    shimmer = np.zeros_like(t)
    for detune in [0.99, 1.0, 1.01]:
        phase = 2 * np.pi * f_start * duration * ( (f_end/f_start)**(t/duration) - 1) / np.log(f_end/f_start) * detune
        shimmer += np.sin(phase)
    
    envelope = np.concatenate([
        np.linspace(0, 1, int(sample_rate * 0.5)), 
        np.linspace(1, 0, int(sample_rate * (duration - 0.5)))
    ])
    if len(envelope) < len(shimmer):
        envelope = np.pad(envelope, (0, len(shimmer)-len(envelope)))
    elif len(envelope) > len(shimmer):
        envelope = envelope[:len(shimmer)]
        
    shimmer = shimmer * envelope
    if np.max(np.abs(shimmer)) > 0:
        shimmer = shimmer / np.max(np.abs(shimmer))
    return shimmer

def generate_piano_chord(duration=2.5, sample_rate=44100):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    frequencies = [261.63, 329.63, 392.00, 493.88] # Cmaj7
    chord = np.zeros_like(t)
    for freq in frequencies:
        for i, harmonic in enumerate(range(1, 6)):
            amp = 1.0 / (harmonic ** 1.5)
            # Add random phase to harmonics for organic feel?
            chord += amp * np.sin(2 * np.pi * freq * harmonic * t) * np.exp(-t * harmonic * 1.5)

    envelope = np.exp(-t * 1.0)
    attack_len = int(0.02 * sample_rate)
    envelope[:attack_len] *= np.linspace(0, 1, attack_len)
    chord = chord * envelope
    if np.max(np.abs(chord)) > 0:
        chord = chord / np.max(np.abs(chord))
    return chord

def generate_page_slide(duration=1.5, sample_rate=44100):
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    noise = np.random.normal(0, 1, len(t))
    sos = signal.butter(4, 1200, 'low', fs=sample_rate, output='sos')
    filtered = signal.sosfilt(sos, noise)
    envelope = np.sin(np.pi * t / duration) ** 2
    slide = filtered * envelope
    if np.max(np.abs(slide)) > 0:
        slide = slide / np.max(np.abs(slide))
    return slide

def generate_voice_wav(text="arc", filename="voice.wav"):
    engine = pyttsx3.init()
    # Try to set properties closer to "calm, neutral"
    # SAPI5 voices usually have 'id'. 
    # List voices to find a good one?
    # We'll just take the default or the first one.
    engine.setProperty('rate', 130) # Slower
    engine.save_to_file(text, filename)
    engine.runAndWait()

def read_wav_as_float(filename, target_rate=44100):
    rate, data = wavfile.read(filename)
    # Normalize to -1..1
    if data.dtype == np.int16:
        data = data / 32768.0
    elif data.dtype == np.int32:
        data = data / 2147483648.0
    elif data.dtype == np.uint8:
        data = (data - 128) / 128.0
    
    # Convert to mono if stereo
    if len(data.shape) > 1:
        data = np.mean(data, axis=1)
        
    # Resample if needed
    if rate != target_rate:
        num_samples = int(len(data) * target_rate / rate)
        data = signal.resample(data, num_samples)
        
    return data

def main():
    print("Generating components...")
    
    # 1. Clicks
    clicks = []
    for _ in range(3):
        clicks.append(generate_click(0.05, SAMPLE_RATE))
    
    # 2. Shimmer
    shimmer = generate_shimmer(2.0, SAMPLE_RATE)
    
    # 3. Piano
    piano = generate_piano_chord(3.0, SAMPLE_RATE)
    
    # 4. Slide
    slide = generate_page_slide(1.5, SAMPLE_RATE)
    
    # 5. Voice
    print("Generating voice...")
    voice_filename = "temp_voice.wav"
    generate_voice_wav("arc", voice_filename)
    if os.path.exists(voice_filename):
        voice = read_wav_as_float(voice_filename, SAMPLE_RATE)
        os.remove(voice_filename)
    else:
        print("Warning: Voice generation failed. Using silence.")
        voice = np.zeros(int(SAMPLE_RATE * 1.0))

    # Mix
    # Master buffer: 4.5 seconds stereo
    total_samples = int(4.5 * SAMPLE_RATE)
    # Initialize separate channels for stereo placement
    left = np.zeros(total_samples)
    right = np.zeros(total_samples)
    
    def add_sound(sound, position_ms, gain_db, pan=0.0):
        # pan: -1.0 (left) to 1.0 (right)
        start_sample = int(position_ms * SAMPLE_RATE / 1000)
        length = len(sound)
        end_sample = start_sample + length
        
        if end_sample > total_samples:
            sound = sound[:total_samples - start_sample]
            end_sample = total_samples
            
        gain = 10 ** (gain_db / 20.0)
        
        # Panning logic (simple equal power or linear)
        # Linear:
        gain_l = gain * (0.5 * (1 - pan))
        gain_r = gain * (0.5 * (1 + pan))
        
        left[start_sample:end_sample] += sound * gain_l
        right[start_sample:end_sample] += sound * gain_r

    # Mix Sequence
    # Clicks (center, slight pan jitter)
    add_sound(clicks[0], 0, -5, -0.1)
    add_sound(clicks[1], 80, -5, 0.1)
    add_sound(clicks[2], 160, -5, 0.0)
    
    # Shimmer (wide stereo)
    # Simulate wide stereo by adding phase inverted copy or just center for now
    # Let's simple pan center
    add_sound(shimmer, 200, -12, 0.0)
    
    # Piano (warm, slightly wide)
    add_sound(piano, 1000, -5, 0.1) # Pan slightly right
    
    # Page Slide (background, left)
    add_sound(slide, 1000, -18, -0.2)
    
    # Voice (Center)
    add_sound(voice, 3000, 0, 0.0)
    
    # Combine to stereo interleaved
    stereo_data = np.vstack((left, right)).T
    
    # Normalize master
    max_val = np.max(np.abs(stereo_data))
    if max_val > 0:
        stereo_data = stereo_data / max_val * 0.9 # Headroom
    
    # Convert and Save
    output_filename = "arc_audio_logo.wav"
    wavfile.write(output_filename, SAMPLE_RATE, float_to_int16(stereo_data))
    print(f"Done. Saved to {output_filename}")

if __name__ == "__main__":
    main()
