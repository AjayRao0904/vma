const ffmpeg = require('fluent-ffmpeg');
const { existsSync } = require('fs');

console.log('=== FFmpeg Configuration Test ===\n');

// Try to get ffmpeg-static
try {
  const ffmpegStatic = require('ffmpeg-static');
  console.log('✅ ffmpeg-static found:', ffmpegStatic);
  console.log('📁 File exists:', existsSync(ffmpegStatic));

  // Set it in fluent-ffmpeg
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log('✅ Set in fluent-ffmpeg');

  // Test if fluent-ffmpeg can use it
  ffmpeg.getAvailableFormats((err, formats) => {
    if (err) {
      console.error('❌ Error testing FFmpeg:', err.message);
    } else {
      console.log('✅ FFmpeg is working! Available formats count:', Object.keys(formats).length);
    }
  });

} catch (error) {
  console.error('❌ Error:', error.message);
}
