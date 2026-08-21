/**
 * ScribbleNoteEditor
 * ──────────────────
 * Draw mode  → freehand canvas (react-native-signature-canvas)
 * Speech mode → expo-speech-recognition transcribes and injects
 *               text directly onto the canvas via the WebView ref
 *               (accessed through webviewProps.ref override)
 */

import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native'
import { Text, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import SignatureCanvas, { SignatureViewRef } from 'react-native-signature-canvas'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'

type Mode = 'draw' | 'speech'

interface Props {
  onChange?: (base64: string) => void
  accentColor?: string
}

const CANVAS_HEIGHT = 300
const SPEECH_TEXT_COLOR = '#1b5e20'
const FONT_SIZE = 15
const LINE_HEIGHT = FONT_SIZE + 8
const TEXT_PAD = 16

const customHtml = (script: string) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Signature Canvas</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
    body { font-family: Helvetica, Sans-Serif; -moz-user-select: none; -webkit-user-select: none; -ms-user-select: none; }
    .rotated-true { transform: rotate(90deg); transform-origin: bottom left; position: absolute; top: -100vw; left: 0; height: 100vw; width: 100vh; overflow: auto; }
    .rotated-false { width: 100%; height: 100%; }
    .m-signature-pad { font-size: 10px; width: 100%; height: 100%; border: 1px solid #e8e8e8; background-color: #fff; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.27), 0 0 40px rgba(0, 0, 0, 0.08) inset; }
    .m-signature-pad--body { position: relative; width: 100%; height: 100%; border: 1px solid #f4f4f4; }
    .m-signature-pad--body canvas { display: block; position: absolute; left: 0; top: 0; width: 100%; height: 100%; border-radius: 4px; box-shadow: 0 0 5px rgba(0, 0, 0, 0.02) inset; }
    .m-signature-pad--footer { display: none; }
    <%style%>
  </style>
</head>
<body onselectstart="return false">
  <div class="rotated-<%orientation%>">
    <div id="signature-pad" class="m-signature-pad">
      <div class="m-signature-pad--body">
        <img style="position: absolute; top: 0; left: 0; pointer-events: none;" src=<%bgSrc%> width=<%bgWidth%> height=<%bgHeight%> />
        <canvas></canvas>
        <img style="position: absolute; top: 0; left: 0; pointer-events: none;" src=<%overlaySrc%> width=<%overlayWidth%> height=<%overlayHeight%> />
      </div>
      <div class="m-signature-pad--footer">
        <button type="button" class="button clear" data-action="clear"><%clear%></button>
        <div class="description"><%description%></div>
        <button type="button" class="button save" data-action="save"><%confirm%></button>
      </div>
    </div>
  </div>

  <script>
    ${script}

    // Bridge for injecting recognized speech text into canvas
    var _origChangePenColor = window.changePenColor;
    window.changePenColor = function(color) {
      if (typeof color === 'string' && color.indexOf('__INJECT_TEXT__:') === 0) {
        try {
          var payload = JSON.parse(color.substring(16));
          var canvas = document.querySelector('canvas');
          if (canvas && signaturePad) {
            var ctx = canvas.getContext('2d');
            ctx.save();
            ctx.font = 'italic ' + (payload.fontSize || 15) + 'px sans-serif';
            ctx.fillStyle = payload.color || '${SPEECH_TEXT_COLOR}';
            var maxW = (canvas.clientWidth || (canvas.width / (window.devicePixelRatio || 1))) - (payload.textPad || 16) * 2;
            if (maxW <= 0) maxW = 300;
            var lh = payload.lineHeight || 23;
            var x = payload.textPad || 16;
            var y = payload.y || 24;
            var words = (payload.text || '').split(' ');
            var line = '';
            for (var i = 0; i < words.length; i++) {
              var test = line + words[i] + ' ';
              if (ctx.measureText(test).width > maxW && i > 0) {
                ctx.fillText(line.trim(), x, y);
                y += lh;
                line = words[i] + ' ';
              } else {
                line = test;
              }
            }
            if (line.trim()) ctx.fillText(line.trim(), x, y);
            ctx.restore();
            signaturePad._isEmpty = false;
            readSignature();
          }
        } catch(e) {
          console.error('Speech text injection error:', e);
        }
        return;
      }
      if (_origChangePenColor) {
        _origChangePenColor(color);
      }
    };
  </script>
</body>
</html>`

export default function ScribbleNoteEditor({ onChange, accentColor = '#00796b' }: Props) {
  const sigRef = useRef<SignatureViewRef>(null)

  const [mode, setMode]         = useState<Mode>('draw')
  const [penColor, setPenColor] = useState('#1a237e')
  const [penSize, setPenSize]   = useState(3)
  const [isEraser, setIsEraser] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [liveText, setLiveText]       = useState('')
  const isListeningRef = useRef(false)
  const textCursorY    = useRef(24)

  // ── Pulse animation ────────────────────────────────────────────────────────
  const pulseAnim = useRef(new Animated.Value(1)).current
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)

  useEffect(() => {
    if (isListening) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.45, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      )
      pulseLoop.current.start()
    } else {
      pulseLoop.current?.stop()
      pulseAnim.setValue(1)
    }
    return () => pulseLoop.current?.stop()
  }, [isListening])

  // ── Speech events ──────────────────────────────────────────────────────────

  useSpeechRecognitionEvent('result', (event) => {
    const first = event.results?.[0]
    if (!first) return
    if (!event.isFinal) {
      setLiveText(first.transcript)
    } else {
      const chunk = first.transcript.trim()
      if (chunk) {
        setLiveText('')
        injectText(chunk)
      }
    }
  })

  useSpeechRecognitionEvent('end', () => {
    if (isListeningRef.current) {
      setTimeout(() => {
        if (isListeningRef.current) {
          ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
        }
      }, 250)
    }
  })

  useSpeechRecognitionEvent('error', (event) => {
    console.log('[Speech] error:', event.error)
    if (isListeningRef.current && ['no-speech', 'network', 'speech-timeout'].includes(event.error)) {
      setTimeout(() => {
        if (isListeningRef.current) {
          ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
        }
      }, 400)
    }
  })

  // ── Inject text onto the canvas via customHtml bridge ─────────────────────

  const injectText = useCallback((text: string) => {
    const y = textCursorY.current
    const estimatedLines = Math.max(1, Math.ceil(text.length / 28))
    textCursorY.current = y + estimatedLines * LINE_HEIGHT + 4

    const payload = JSON.stringify({
      text,
      y,
      fontSize: FONT_SIZE,
      lineHeight: LINE_HEIGHT,
      textPad: TEXT_PAD,
      color: SPEECH_TEXT_COLOR,
    })

    sigRef.current?.changePenColor(`__INJECT_TEXT__:${payload}`)
  }, [])

  // ── Draw helpers ───────────────────────────────────────────────────────────

  const selectColor = (c: string) => {
    setPenColor(c)
    setIsEraser(false)
    sigRef.current?.draw()
    sigRef.current?.changePenColor(c)
  }
  const selectPenSize = (s: number) => {
    setPenSize(s)
    sigRef.current?.changePenSize(s, s + 1)
  }
  const toggleEraser = () => {
    setIsEraser(e => {
      const next = !e
      if (next) {
        sigRef.current?.erase()
      } else {
        sigRef.current?.draw()
        sigRef.current?.changePenColor(penColor)
      }
      return next
    })
  }
  const handleUndo  = () => sigRef.current?.undo()
  const handleClear = () => {
    sigRef.current?.clearSignature()
    textCursorY.current = 24
    setLiveText('')
  }

  // ── Voice controls ─────────────────────────────────────────────────────────

  const startListening = async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!perm.granted) { console.warn('[Speech] permission denied'); return }
    isListeningRef.current = true
    setIsListening(true)
    ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
  }

  const stopListening = () => {
    isListeningRef.current = false
    setIsListening(false)
    setLiveText('')
    ExpoSpeechRecognitionModule.stop()
  }

  const toggleMic = () => isListening ? stopListening() : startListening()

  const switchMode = (next: Mode) => {
    if (mode === 'speech' && next === 'draw' && isListening) stopListening()
    setMode(next)
  }

  const webStyle = `
    .m-signature-pad { box-shadow: none; border: none; }
    .m-signature-pad--body { border: none; }
    .m-signature-pad--footer { display: none; }
    body { background: #fafafa; margin: 0; padding: 0; }
  `

  return (
    <View style={styles.wrapper}>

      {/* ── Mode toggle ── */}
      <View style={styles.modeRow}>
        {(['draw', 'speech'] as Mode[]).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && { backgroundColor: accentColor }]}
            onPress={() => switchMode(m)}
          >
            <MaterialCommunityIcons
              name={m === 'draw' ? 'pencil' : 'microphone'}
              size={14}
              color={mode === m ? '#fff' : '#666'}
            />
            <Text style={[styles.modeBtnText, mode === m && { color: '#fff' }]}>
              {m === 'draw' ? 'Draw' : 'Speech'}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.modeHint}>
          {mode === 'draw'
            ? 'Draw freely · switch to Speech to dictate'
            : 'Speak — text renders on canvas in green'}
        </Text>
      </View>

      <Divider />

      {/* ── Draw toolbar ── */}
      {mode === 'draw' && (
        <View style={styles.toolbar}>
          {['#1a237e', '#b71c1c', '#1b5e20', '#e65100', '#000000'].map(c => (
            <TouchableOpacity
              key={c}
              onPress={() => selectColor(c)}
              style={[
                styles.colorDot,
                { backgroundColor: c },
                penColor === c && !isEraser && styles.colorDotActive,
              ]}
            />
          ))}
          <View style={styles.sep} />
          {[{ s: 2, d: 6 }, { s: 4, d: 10 }, { s: 7, d: 14 }].map(({ s, d }) => (
            <TouchableOpacity key={s} onPress={() => selectPenSize(s)} style={styles.tbBtn}>
              <View style={{
                width: d, height: d, borderRadius: d / 2,
                backgroundColor: isEraser ? '#ccc' : penColor,
                opacity: penSize === s ? 1 : 0.3,
              }} />
            </TouchableOpacity>
          ))}
          <View style={styles.sep} />
          <TouchableOpacity onPress={toggleEraser} style={[styles.tbBtn, isEraser && styles.tbBtnActive]}>
            <MaterialCommunityIcons name="eraser" size={18} color={isEraser ? accentColor : '#555'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleUndo} style={styles.tbBtn}>
            <MaterialCommunityIcons name="undo" size={18} color="#555" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.tbBtn}>
            <MaterialCommunityIcons name="delete-outline" size={18} color="#c62828" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Speech toolbar ── */}
      {mode === 'speech' && (
        <View style={styles.speechBar}>
          <TouchableOpacity onPress={toggleMic} style={styles.micWrap}>
            <Animated.View style={[
              styles.micRing,
              { transform: [{ scale: pulseAnim }], backgroundColor: isListening ? '#ffcdd2' : 'transparent' }
            ]} />
            <View style={[styles.micBtn, { backgroundColor: isListening ? '#e53935' : accentColor }]}>
              <MaterialCommunityIcons
                name={isListening ? 'microphone' : 'microphone-outline'}
                size={22}
                color="#fff"
              />
            </View>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            {isListening ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.recDot} />
                <Text style={styles.recLabel}>Recording… tap to stop</Text>
              </View>
            ) : (
              <Text style={styles.speechHint}>Tap mic and speak — words appear on canvas</Text>
            )}
          </View>

          <TouchableOpacity onPress={handleClear} style={styles.tbBtn}>
            <MaterialCommunityIcons name="delete-outline" size={18} color="#c62828" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Live transcript bubble ── */}
      {isListening && liveText !== '' && (
        <View style={[styles.liveBubble, { borderColor: accentColor }]}>
          <MaterialCommunityIcons name="waveform" size={13} color={accentColor} />
          <Text style={[styles.liveBubbleText, { color: accentColor }]} numberOfLines={2}>
            {liveText}
          </Text>
        </View>
      )}

      <Divider />

      {/* ── Canvas ── always mounted, never unmounted on mode switch ── */}
      <View style={styles.canvasWrap}>
        <SignatureCanvas
          ref={sigRef}
          onOK={(sig) => onChange?.(sig)}
          onEnd={() => sigRef.current?.readSignature()}
          descriptionText=""
          clearText=""
          confirmText=""
          customHtml={customHtml}
          webStyle={webStyle}
          penColor={isEraser ? '#ffffff' : penColor}
          minWidth={penSize}
          maxWidth={penSize + 1}
          style={{ flex: 1, height: CANVAS_HEIGHT }}
          backgroundColor="#fafafa"
          autoClear={false}
          dataURL=""
        />

        {mode === 'speech' && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} pointerEvents="box-only" />
        )}

        <View style={styles.emptyHint} pointerEvents="none">
          <MaterialCommunityIcons name="gesture" size={38} color="#ececec" />
          <Text style={styles.emptyHintText}>
            {mode === 'draw' ? 'Draw your notes here' : 'Dictated text appears here'}
          </Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { overflow: 'hidden', backgroundColor: '#fff' },

  modeRow: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8 },
  modeBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 5, paddingHorizontal: 12,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#d0d0d0', gap: 5,
  },
  modeBtnText: { fontSize: 12, color: '#555' },
  modeHint: { fontSize: 10, color: '#aaa', flex: 1, flexShrink: 1 },

  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    backgroundColor: '#fafafa', gap: 6, flexWrap: 'wrap',
  },
  colorDot: { width: 20, height: 20, borderRadius: 10 },
  colorDotActive: {
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 3, elevation: 4,
  },
  sep: { width: 1, height: 22, backgroundColor: '#e0e0e0', marginHorizontal: 2 },
  tbBtn: { padding: 4 },
  tbBtnActive: { backgroundColor: '#e0f2f1', borderRadius: 6 },

  speechBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#fafafa', gap: 10,
  },
  micWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  micRing: { position: 'absolute', width: 46, height: 46, borderRadius: 23 },
  micBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e53935' },
  recLabel: { fontSize: 11, color: '#e53935', fontWeight: '500' },
  speechHint: { fontSize: 11, color: '#888' },

  liveBubble: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginVertical: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 8, borderWidth: 1, backgroundColor: '#f1f8e9', gap: 6,
  },
  liveBubbleText: { fontSize: 12, fontStyle: 'italic', flex: 1 },

  canvasWrap: { height: CANVAS_HEIGHT, backgroundColor: '#fafafa', position: 'relative' },
  emptyHint: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', opacity: 0.5,
  },
  emptyHintText: { fontSize: 11, color: '#ccc', marginTop: 6 },
})
