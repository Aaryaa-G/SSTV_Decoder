"""
Simple test script to decode SSTV audio files
Usage: python test_decoder.py <path_to_audio_file>

Example:
    python test_decoder.py test_audio/signal.ogg
    python test_decoder.py test_audio/signal.wav
"""

import sys
from pathlib import Path
import time

# Add sstv_module to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sstv.decode import SSTVDecoder


def decode_file(audio_file_path):
    """Decode an SSTV audio file"""
    
    audio_path = Path(audio_file_path)
    
    print("\n" + "="*70)
    print("SSTV DECODER TEST")
    print("="*70 + "\n")
    
    # Check if file exists
    if not audio_path.exists():
        print(f"ERROR: File not found: {audio_file_path}")
        return False
    
    print(f"Input file: {audio_path.name}")
    print(f"Full path: {audio_path.absolute()}")
    print(f"File size: {audio_path.stat().st_size / 1024:.2f} KB")
    print(f"Extension: {audio_path.suffix.upper()}\n")
    
    try:
        print("Loading audio file...")
        with SSTVDecoder(str(audio_path)) as decoder:
            print(f"File loaded successfully!")
            print(f"   Sample rate: {decoder._sample_rate} Hz")
            print(f"   Audio duration: {len(decoder._samples) / decoder._sample_rate:.2f} seconds")
            print(f"   Samples: {len(decoder._samples)}\n")
            
            print("Starting SSTV decode process...")
            print("(This may take a minute or two)\n")
            
            image = decoder.decode()
            
            if image is None:
                print("\nERROR: No SSTV signal found in audio file")
                print("Make sure the audio file contains a valid SSTV transmission")
                return False
            
            print(f"\n[SUCCESS] SSTV signal decoded!")
            print(f"   Detected mode: {decoder.mode.NAME}")
            print(f"   Image size: {image.size[0]}x{image.size[1]} pixels")
            print(f"   Color mode: {image.mode}")
            
            # Save image with unique timestamp to avoid overwriting
            output_dir = Path(__file__).parent / "decoded_output"
            output_dir.mkdir(exist_ok=True)
            
            # Use timestamp to ensure unique filenames
            timestamp = int(time.time() * 1000)  # milliseconds for uniqueness
            output_name = f"{audio_path.stem}_{timestamp}_decoded.png"
            output_path = output_dir / output_name
            
            image.save(str(output_path))
            print(f"\nImage saved to: {output_path}")
            print(f"File size: {output_path.stat().st_size / 1024:.2f} KB")
            
            print("\n" + "="*70)
            print("DECODE SUCCESSFUL!")
            print("="*70 + "\n")
            return True
            
    except FileNotFoundError as e:
        print(f"\nFile Error: {e}")
        return False
    except ValueError as e:
        print(f"\nFormat/Mode Error: {e}")
        return False
    except Exception as e:
        print(f"\nUnexpected Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("\n" + "="*70)
        print("SSTV Audio Decoder")
        print("="*70)
        print("\nUsage: python test_decoder.py <audio_file>")
        print("\nSupported formats:")
        print("  - .wav  (WAV - Windows Audio)")
        print("  - .ogg  (OGG Vorbis) NEW")
        print("  - .flac (FLAC - Free Lossless Audio Codec)")
        print("  - .mp3  (MP3 - MPEG Audio)")
        print("  - .m4a  (M4A - MPEG-4 Audio)")
        print("  - .aiff (AIFF - Audio Interchange)")
        
        print("\nSupported SSTV Modes:")
        print("  - Martin 1, Martin 2")
        print("  - Scottie 1, Scottie 2, Scottie DX")
        print("  - Robot 36, Robot 72")
        print("  - PD 120 (NEW)")
        
        print("\nExamples:")
        print("  python test_decoder.py test_audio/signal.ogg")
        print("  python test_decoder.py test_audio/signal.wav")
        print("\n" + "="*70 + "\n")
        sys.exit(1)
    
    audio_file = sys.argv[1]
    success = decode_file(audio_file)
    sys.exit(0 if success else 1)