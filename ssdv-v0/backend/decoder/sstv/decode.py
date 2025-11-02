"""Class and methods to decode SSTV signal"""

import numpy as np
import soundfile
from PIL import Image
from scipy.signal.windows import hann
import os

from . import spec
from .common import log_message, progress_bar


def calc_lum(freq):
    """Converts SSTV pixel frequency range into 0-255 luminance byte"""

    lum = int(round((freq - 1500) / 3.1372549))
    return min(max(lum, 0), 255)


def barycentric_peak_interp(bins, x):
    """Interpolate between frequency bins to find x value of peak"""

    # Takes x as the index of the largest bin and interpolates the
    # x value of the peak using neighbours in the bins array

    # Make sure data is in bounds
    y1 = bins[x] if x <= 0 else bins[x-1]
    y3 = bins[x] if x + 1 >= len(bins) else bins[x+1]

    denom = y3 + bins[x] + y1
    if denom == 0:
        return 0  # erroneous

    return (y3 - y1) / denom + x


class SSTVDecoder(object):

    """Create an SSTV decoder for decoding audio data (supports WAV, OGG, FLAC, MP3, etc.)"""

    # Supported audio formats
    SUPPORTED_FORMATS = ('.wav', '.ogg', '.flac', '.mp3', '.m4a', '.aiff')

    def __init__(self, audio_file):
        self.mode = None

        self._audio_file = audio_file
        self._file_path = None

        # Validate file format and load audio
        self._validate_and_load_audio(audio_file)

        if self._samples.ndim > 1:  # convert to mono if stereo
            self._samples = self._samples.mean(axis=1)
            log_message("Converted stereo to mono")

    def _validate_and_load_audio(self, audio_file):
        """Validate and load audio file with support for multiple formats"""
        
        if isinstance(audio_file, str):
            self._file_path = audio_file
            
            # Check if file exists
            if not os.path.exists(audio_file):
                raise FileNotFoundError(f"Audio file not found: {audio_file}")
            
            # Check file extension
            file_ext = os.path.splitext(audio_file)[1].lower()
            if file_ext not in self.SUPPORTED_FORMATS:
                raise ValueError(
                    f"Unsupported audio format: {file_ext}. "
                    f"Supported formats: {', '.join(self.SUPPORTED_FORMATS)}"
                )
            
            log_message(f"Loading audio file: {audio_file} ({file_ext})")
            
            try:
                self._samples, self._sample_rate = soundfile.read(audio_file)
            except Exception as e:
                raise RuntimeError(f"Error reading audio file: {str(e)}")
        else:
            # Handle file object (already open file)
            try:
                self._samples, self._sample_rate = soundfile.read(audio_file)
            except Exception as e:
                raise RuntimeError(f"Error reading audio file object: {str(e)}")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, traceback):
        self.close()

    def __del__(self):
        self.close()

    def decode(self, skip=0.0):
        """Attempts to decode the audio data as an SSTV signal

        Returns a PIL image on success, and None if no SSTV signal was found
        """

        if skip > 0.0:
            self._samples = self._samples[round(skip * self._sample_rate):]

        header_end = self._find_header()

        if header_end is None:
            return None

        self.mode = self._decode_vis(header_end)

        vis_end = header_end + round(spec.VIS_BIT_SIZE * 9 * self._sample_rate)

        image_data = self._decode_image_data(vis_end)

        return self._draw_image(image_data)

    def close(self):
        """Closes any input files if they exist"""

        if self._audio_file is not None:
            # Only try to close if it's a file object, not a string path
            if hasattr(self._audio_file, 'closed') and not self._audio_file.closed:
                self._audio_file.close()

    def _peak_fft_freq(self, data):
        """Finds the peak frequency from a section of audio data"""

        windowed_data = data * hann(len(data))
        fft = np.abs(np.fft.rfft(windowed_data))

        # Get index of bin with highest magnitude
        x = np.argmax(fft)
        # Interpolated peak frequency
        peak = barycentric_peak_interp(fft, x)

        # Return frequency in hz
        return peak * self._sample_rate / len(windowed_data)

    def _find_header(self):
        """Finds the approx sample of the end of the calibration header"""

        header_size = round(spec.HDR_SIZE * self._sample_rate)
        window_size = round(spec.HDR_WINDOW_SIZE * self._sample_rate)

        # Relative sample offsets of the header tones
        leader_1_sample = 0
        leader_1_search = leader_1_sample + window_size

        break_sample = round(spec.BREAK_OFFSET * self._sample_rate)
        break_search = break_sample + window_size

        leader_2_sample = round(spec.LEADER_OFFSET * self._sample_rate)
        leader_2_search = leader_2_sample + window_size

        vis_start_sample = round(spec.VIS_START_OFFSET * self._sample_rate)
        vis_start_search = vis_start_sample + window_size

        jump_size = round(0.002 * self._sample_rate)  # check every 2ms

        # The margin of error created here will be negligible when decoding the
        # vis due to each bit having a length of 30ms. We fix this error margin
        # when decoding the image by aligning each sync pulse

        for current_sample in range(0, len(self._samples) - header_size,
                                    jump_size):
            # Update search progress message
            if current_sample % (jump_size * 256) == 0:
                search_msg = "Searching for calibration header... {:.1f}s"
                progress = current_sample / self._sample_rate
                log_message(search_msg.format(progress), recur=True)

            search_end = current_sample + header_size
            search_area = self._samples[current_sample:search_end]

            leader_1_area = search_area[leader_1_sample:leader_1_search]
            break_area = search_area[break_sample:break_search]
            leader_2_area = search_area[leader_2_sample:leader_2_search]
            vis_start_area = search_area[vis_start_sample:vis_start_search]

            # Check they're the correct frequencies
            if (abs(self._peak_fft_freq(leader_1_area) - 1900) < 50
               and abs(self._peak_fft_freq(break_area) - 1200) < 50
               and abs(self._peak_fft_freq(leader_2_area) - 1900) < 50
               and abs(self._peak_fft_freq(vis_start_area) - 1200) < 50):

                stop_msg = "Searching for calibration header... Found!{:>4}"
                log_message(stop_msg.format(' '))
                return current_sample + header_size

        log_message()
        log_message("Couldn't find SSTV header in the given audio file",
                    err=True)
        return None

    def _decode_vis(self, vis_start):
        """Decodes the vis from the audio data and returns the SSTV mode"""

        bit_size = round(spec.VIS_BIT_SIZE * self._sample_rate)
        vis_bits = []

        for bit_idx in range(8):
            bit_offset = vis_start + bit_idx * bit_size
            section = self._samples[bit_offset:bit_offset+bit_size]
            freq = self._peak_fft_freq(section)
            # 1100 hz = 1, 1300hz = 0
            vis_bits.append(int(freq <= 1200))

        # Check for even parity in last bit
        parity = sum(vis_bits) % 2 == 0
        if not parity:
            raise ValueError("Error decoding VIS header (invalid parity bit)")

        # LSB first so we must reverse and ignore the parity bit
        vis_value = 0
        for bit in vis_bits[-2::-1]:
            vis_value = (vis_value << 1) | bit

        if vis_value not in spec.VIS_MAP:
            error = "SSTV mode is unsupported (VIS: {})"
            raise ValueError(error.format(vis_value))

        mode = spec.VIS_MAP[vis_value]
        log_message("Detected SSTV mode {}".format(mode.NAME))

        return mode

    def _align_sync(self, align_start, start_of_sync=True):
        """Returns sample where the beginning of the sync pulse was found"""

        # TODO - improve this

        sync_window = round(self.mode.SYNC_PULSE * 1.4 * self._sample_rate)
        align_stop = len(self._samples) - sync_window

        if align_stop <= align_start:
            return None  # Reached end of audio

        for current_sample in range(align_start, align_stop):
            section_end = current_sample + sync_window
            search_section = self._samples[current_sample:section_end]

            if self._peak_fft_freq(search_section) > 1350:
                break

        end_sync = current_sample + (sync_window // 2)

        if start_of_sync:
            return end_sync - round(self.mode.SYNC_PULSE * self._sample_rate)
        else:
            return end_sync

    def _decode_image_data(self, image_start):
        """Decodes image from the transmission section of an sstv signal"""

        height = self.mode.LINE_COUNT
        width = self.mode.LINE_WIDTH
        
        # Check if this is a PD mode (PD90, PD120, etc.)
        is_pd_mode = hasattr(self.mode, 'PIXEL') and self.mode.NAME.startswith('PD')
        
        if is_pd_mode:
            return self._decode_pd_image_data(image_start)
        else:
            return self._decode_standard_image_data(image_start)

    def _decode_standard_image_data(self, image_start):
        """Decodes standard SSTV modes (Martin, Scottie, Robot)"""

        window_factor = self.mode.WINDOW_FACTOR
        centre_window_time = (self.mode.PIXEL_TIME * window_factor) / 2
        pixel_window = round(centre_window_time * 2 * self._sample_rate)

        height = self.mode.LINE_COUNT
        channels = self.mode.CHAN_COUNT
        width = self.mode.LINE_WIDTH
        image_data = [[[0 for i in range(width)]
                       for j in range(channels)] for k in range(height)]

        seq_start = image_start
        if self.mode.HAS_START_SYNC:
            seq_start = self._align_sync(image_start, start_of_sync=False)
            if seq_start is None:
                raise EOFError("Reached end of audio before image data")

        for line in range(height):

            if self.mode.CHAN_SYNC > 0 and line == 0:
                sync_offset = self.mode.CHAN_OFFSETS[self.mode.CHAN_SYNC]
                seq_start -= round((sync_offset + self.mode.SCAN_TIME)
                                   * self._sample_rate)

            for chan in range(channels):

                if chan == self.mode.CHAN_SYNC:
                    if line > 0 or chan > 0:
                        seq_start += round(self.mode.LINE_TIME *
                                           self._sample_rate)

                    seq_start = self._align_sync(seq_start)
                    if seq_start is None:
                        log_message()
                        log_message("Reached end of audio whilst decoding.")
                        return image_data

                pixel_time = self.mode.PIXEL_TIME
                if self.mode.HAS_HALF_SCAN:
                    if chan > 0:
                        pixel_time = self.mode.HALF_PIXEL_TIME

                    centre_window_time = (pixel_time * window_factor) / 2
                    pixel_window = round(centre_window_time * 2 *
                                         self._sample_rate)

                for px in range(width):

                    chan_offset = self.mode.CHAN_OFFSETS[chan]

                    px_pos = round(seq_start + (chan_offset + px *
                                   pixel_time - centre_window_time) *
                                   self._sample_rate)
                    px_end = px_pos + pixel_window

                    if px_end >= len(self._samples):
                        log_message()
                        log_message("Reached end of audio whilst decoding.")
                        return image_data

                    pixel_area = self._samples[px_pos:px_end]
                    freq = self._peak_fft_freq(pixel_area)

                    image_data[line][chan][px] = calc_lum(freq)

            progress_bar(line, height - 1, "Decoding image...")

        return image_data

    def _decode_pd_image_data(self, image_start):
        """Decodes PD modes (PD90, PD120, etc.) with 4:2:0 chroma subsampling
        
        PD modes encode data as:
        - Sync pulse (20ms)
        - Porch (2.08ms of black)
        - Y0 line (640 pixels)
        - Cr line (640 pixels, averaged from 2 lines)
        - Cb line (640 pixels, averaged from 2 lines)
        - Y1 line (640 pixels)
        This pattern repeats for pairs of lines
        """
        
        width = self.mode.LINE_WIDTH
        height = self.mode.LINE_COUNT
        pixel_time = self.mode.PIXEL * 0.001  # Convert ms to seconds
        sync_time = self.mode.SYNC_PULSE * 0.001
        porch_time = self.mode.PORCH * 0.001
        
        window_factor = 2.0
        centre_window_time = (pixel_time * window_factor) / 2
        pixel_window = round(centre_window_time * 2 * self._sample_rate)
        
        # 3D array: [line][channel][pixel]
        # Channels: 0=Y, 1=Cb, 2=Cr
        image_data = [[[0 for i in range(width)]
                       for j in range(3)] for k in range(height)]
        
        seq_start = image_start
        
        # Process pairs of lines
        for line_pair in range(0, height, 2):
            # Align to sync pulse
            seq_start = self._align_sync(seq_start, start_of_sync=True)
            if seq_start is None:
                log_message()
                log_message("Reached end of audio whilst decoding.")
                return image_data
            
            # Skip porch (black gap after sync)
            porch_samples = round(porch_time * self._sample_rate)
            seq_start += porch_samples
            
            # Read Y0 line
            for px in range(width):
                px_pos = round(seq_start + px * pixel_time * self._sample_rate - 
                              centre_window_time * self._sample_rate)
                px_end = px_pos + pixel_window
                
                if px_end >= len(self._samples):
                    log_message()
                    log_message("Reached end of audio whilst decoding.")
                    return image_data
                
                pixel_area = self._samples[px_pos:px_end]
                freq = self._peak_fft_freq(pixel_area)
                image_data[line_pair][0][px] = calc_lum(freq)
            
            seq_start += round(width * pixel_time * self._sample_rate)
            
            # Read Cr line (shared between both lines)
            cr_line = []
            for px in range(width):
                px_pos = round(seq_start + px * pixel_time * self._sample_rate - 
                              centre_window_time * self._sample_rate)
                px_end = px_pos + pixel_window
                
                if px_end >= len(self._samples):
                    log_message()
                    log_message("Reached end of audio whilst decoding.")
                    return image_data
                
                pixel_area = self._samples[px_pos:px_end]
                freq = self._peak_fft_freq(pixel_area)
                cr_val = calc_lum(freq)
                cr_line.append(cr_val)
                image_data[line_pair][2][px] = cr_val
            
            seq_start += round(width * pixel_time * self._sample_rate)
            
            # Read Cb line (shared between both lines)
            cb_line = []
            for px in range(width):
                px_pos = round(seq_start + px * pixel_time * self._sample_rate - 
                              centre_window_time * self._sample_rate)
                px_end = px_pos + pixel_window
                
                if px_end >= len(self._samples):
                    log_message()
                    log_message("Reached end of audio whilst decoding.")
                    return image_data
                
                pixel_area = self._samples[px_pos:px_end]
                freq = self._peak_fft_freq(pixel_area)
                cb_val = calc_lum(freq)
                cb_line.append(cb_val)
                image_data[line_pair][1][px] = cb_val
            
            seq_start += round(width * pixel_time * self._sample_rate)
            
            # Read Y1 line
            if line_pair + 1 < height:
                for px in range(width):
                    px_pos = round(seq_start + px * pixel_time * self._sample_rate - 
                                  centre_window_time * self._sample_rate)
                    px_end = px_pos + pixel_window
                    
                    if px_end >= len(self._samples):
                        log_message()
                        log_message("Reached end of audio whilst decoding.")
                        return image_data
                    
                    pixel_area = self._samples[px_pos:px_end]
                    freq = self._peak_fft_freq(pixel_area)
                    image_data[line_pair + 1][0][px] = calc_lum(freq)
                
                seq_start += round(width * pixel_time * self._sample_rate)
                
                # Copy Cb/Cr to second line
                for px in range(width):
                    image_data[line_pair + 1][2][px] = cr_line[px]
                    image_data[line_pair + 1][1][px] = cb_line[px]
            
            progress_bar(line_pair, height - 1, "Decoding image...")
        
        return image_data

    def _draw_image(self, image_data):
        """Renders the image from the decoded sstv signal"""

        # Let PIL do YUV-RGB conversion for us
        if self.mode.COLOR == spec.COL_FMT.YUV:
            col_mode = "YCbCr"
        else:
            col_mode = "RGB"

        width = self.mode.LINE_WIDTH
        height = self.mode.LINE_COUNT
        channels = self.mode.CHAN_COUNT

        image = Image.new(col_mode, (width, height))
        pixel_data = image.load()

        log_message("Drawing image data...")

        for y in range(height):

            odd_line = y % 2
            for x in range(width):

                if channels == 2:

                    if self.mode.HAS_ALT_SCAN:
                        if self.mode.COLOR == spec.COL_FMT.YUV:
                            # R36
                            pixel = (image_data[y][0][x],
                                     image_data[y-(odd_line-1)][1][x],
                                     image_data[y-odd_line][1][x])

                elif channels == 3:

                    if self.mode.COLOR == spec.COL_FMT.GBR:
                        # M1, M2, S1, S2, SDX
                        pixel = (image_data[y][2][x],
                                 image_data[y][0][x],
                                 image_data[y][1][x])
                    elif self.mode.COLOR == spec.COL_FMT.YUV:
                        # R72, PD modes
                        pixel = (image_data[y][0][x],
                                 image_data[y][1][x],
                                 image_data[y][2][x])
                    elif self.mode.COLOR == spec.COL_FMT.RGB:
                        pixel = (image_data[y][0][x],
                                 image_data[y][1][x],
                                 image_data[y][2][x])

                pixel_data[x, y] = pixel

        if image.mode != "RGB":
            image = image.convert("RGB")

        log_message("...Done!")
        return image