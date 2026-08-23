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
import { WebView } from 'react-native-webview'
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

export default function ScribbleNoteEditor({ onChange, accentColor = '#00796b' }: Props) {
  const sigRef = useRef<SignatureViewRef>(null)
  const webRef = useRef<WebView>(null)

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

  // ── Inject text onto the canvas via WebView ref ───────────────────────────

  const injectText = useCallback((text: string) => {
    const wv = webRef.current
    if (!wv) {
      console.log('[ScribbleNoteEditor] webRef not ready')
      return
    }

    const y = textCursorY.current
    const estimatedLines = Math.max(1, Math.ceil(text.length / 28))
    textCursorY.current = y + estimatedLines * LINE_HEIGHT + 4

    const js = `
      (function() {
        try {
          var canvas = document.querySelector('canvas');
          if (!canvas) { console.log('canvas not found'); return; }
          var ctx = canvas.getContext('2d');
          ctx.save();
          ctx.font = 'italic ${FONT_SIZE}px sans-serif';
          ctx.fillStyle = '${SPEECH_TEXT_COLOR}';
          var maxW = canvas.width - ${TEXT_PAD * 2};
          var lh   = ${LINE_HEIGHT};
          var x    = ${TEXT_PAD};
          var y    = ${y};
          var words = ${JSON.stringify(text)}.split(' ');
          var line  = '';
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
        } catch(e) { console.log('inject error: ' + e.message); }
      })();
      true;
    `
    wv.injectJavaScript(js)
    sigRef.current?.readSignature()
  }, [])

  // ── Draw helpers ───────────────────────────────────────────────────────────

  const selectColor = (c: string) => { setPenColor(c); setIsEraser(false) }
  const toggleEraser = () => setIsEraser(e => !e)
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
            <TouchableOpacity key={s} onPress={() => setPenSize(s)} style={styles.tbBtn}>
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
          webStyle={webStyle}
          penColor={isEraser ? '#ffffff' : penColor}
          minWidth={penSize}
          maxWidth={penSize + 1}
          style={{ flex: 1, height: CANVAS_HEIGHT }}
          backgroundColor="#fafafa"
          autoClear={false}
          dataURL=""
          webviewProps={{ ref: webRef } as any}
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
