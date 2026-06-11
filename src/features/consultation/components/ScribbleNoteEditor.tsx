import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import {
	Alert,
	Animated,
	Dimensions,
	Easing,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { Button, Divider, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import SignatureCanvas, { SignatureViewRef } from 'react-native-signature-canvas'
import { WebView } from 'react-native-webview'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'

type Mode = 'draw' | 'speech' | 'text'

export interface TextBlock {
	id: string
	text: string
	x: number
	y: number
	fontSize: number
	color: string
	width: number
	createdAt: number
}

export interface NotesData {
	drawingBase64: string
	textBlocks: TextBlock[]
	mergedBase64: string
}

interface Props {
	accentColor?: string
	initialDrawingBase64?: string
	initialTextBlocks?: TextBlock[]
	onNotesChange?: (data: NotesData) => void
	onChange?: (mergedBase64: string) => void
	onTextChange?: (textBlocks: TextBlock[]) => void
	onInteractionChange?: (active: boolean) => void
}

export interface ScribbleNoteEditorRef {
	getNotesData: () => NotesData
	clearAll: () => void
	undo: () => void
	redo: () => void
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const CANVAS_HEIGHT = 250
const TEXT_PAD = 16
const DEFAULT_FONT_SIZE = 16
const LINE_HEIGHT = DEFAULT_FONT_SIZE + 6
const TEXT_COLOR = '#1b5e20'
const DEFAULT_TEXT_BOX_WIDTH = Math.min(320, SCREEN_WIDTH - TEXT_PAD * 2)
const BLANK_CANVAS = ''
const START_Y = 24
const BLOCK_SPACING = 12

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max))

const normalizeBlock = (block: TextBlock): TextBlock => ({
	...block,
	width: block.width ?? DEFAULT_TEXT_BOX_WIDTH,
	x: block.x ?? TEXT_PAD,
	fontSize: block.fontSize ?? DEFAULT_FONT_SIZE,
	color: block.color ?? TEXT_COLOR,
	createdAt: block.createdAt ?? Date.now(),
})

function estimateTextBlockHeight(block: TextBlock): number {
	const text = block.text || ''
	if (!text.trim()) return LINE_HEIGHT + 4
	const words = text.split(/\s+/)
	let lineCount = 1
	let currentLineWidth = 0
	const charWidthEstimate = 7.5
	const maxWidth = block.width - 12

	for (const word of words) {
		const wordWidth = word.length * charWidthEstimate
		if (currentLineWidth + wordWidth > maxWidth && currentLineWidth > 0) {
			lineCount++
			currentLineWidth = wordWidth
		} else {
			currentLineWidth += wordWidth + (currentLineWidth > 0 ? charWidthEstimate : 0)
		}
	}
	return Math.max(LINE_HEIGHT, lineCount * LINE_HEIGHT) + 6
}

function layoutTextBlocks(blocks: TextBlock[]): TextBlock[] {
	if (!blocks.length) return []
	const sorted = [...blocks].sort((a, b) => a.createdAt - b.createdAt)
	let currentY = START_Y
	return sorted.map((block) => {
		const height = estimateTextBlockHeight(block)
		const positioned = { ...block, y: currentY, x: TEXT_PAD }
		currentY += height + BLOCK_SPACING
		return positioned
	})
}

const ScribbleNoteEditor = forwardRef<ScribbleNoteEditorRef, Props>(
	(
		{
			accentColor = '#00796b',
			initialDrawingBase64 = '',
			initialTextBlocks = [],
			onNotesChange,
			onChange,
			onTextChange,
			onInteractionChange,
		},
		ref
	) => {
		const sigRef = useRef<SignatureViewRef>(null)
		const webRef = useRef<WebView>(null)

		const [mode, setMode] = useState<Mode>('draw')
		const [penColor, setPenColor] = useState('#1a237e')
		const [penSize, setPenSize] = useState(3)
		const [isEraser, setIsEraser] = useState(false)

		const [drawingBase64, setDrawingBase64] = useState(initialDrawingBase64 || BLANK_CANVAS)
		const drawingBase64Ref = useRef(initialDrawingBase64 || BLANK_CANVAS)

		const [, setMergedBase64] = useState(initialDrawingBase64 || BLANK_CANVAS)
		const mergedBase64Ref = useRef(initialDrawingBase64 || BLANK_CANVAS)

		const [webViewReady, setWebViewReady] = useState(false)
		const pendingRestoreRef = useRef<string | null>(initialDrawingBase64 || null)

		const [historyStack, setHistoryStack] = useState<Array<{ drawing: string; blocks: TextBlock[] }>>([])
		const [historyIndex, setHistoryIndex] = useState(-1)
		const historyStackRef = useRef<Array<{ drawing: string; blocks: TextBlock[] }>>([])
		const historyIndexRef = useRef(-1)
		const isUndoRedoRef = useRef(false)

		const [textBlocks, setTextBlocks] = useState<TextBlock[]>(() =>
			layoutTextBlocks(initialTextBlocks.map(normalizeBlock))
		)
		const textBlocksRef = useRef<TextBlock[]>(textBlocks)

		const [isListening, setIsListening] = useState(false)
		const [liveText, setLiveText] = useState('')
		const isListeningRef = useRef(false)
		const userStoppedRef = useRef(false)

		const [editingBlock, setEditingBlock] = useState<TextBlock | null>(null)
		const [editTextValue, setEditTextValue] = useState('')

		const [showTextInput, setShowTextInput] = useState(false)
		const [newTextValue, setNewTextValue] = useState('')

		const [isMounted, setIsMounted] = useState(false)

		const handleInteractionStart = useCallback(() => {
			onInteractionChange?.(true)
		}, [onInteractionChange])

		const handleInteractionEnd = useCallback(() => {
			onInteractionChange?.(false)
		}, [onInteractionChange])

		const pushCombinedHistory = useCallback((drawing: string, blocks: TextBlock[]) => {
			if (isUndoRedoRef.current) return
			const newEntry = { drawing, blocks: JSON.parse(JSON.stringify(blocks)) }
			const currentStack = historyStackRef.current
			const currentIdx = historyIndexRef.current
			const newStack = currentStack.slice(0, currentIdx + 1)
			newStack.push(newEntry)
			const limited = newStack.slice(-50)
			historyStackRef.current = limited
			historyIndexRef.current = limited.length - 1
			setHistoryStack(limited)
			setHistoryIndex(limited.length - 1)
		}, [])

		const notifyChange = useCallback(
			(
				nextDrawing = drawingBase64Ref.current,
				nextBlocks = textBlocksRef.current,
				nextMerged = mergedBase64Ref.current
			) => {
				onNotesChange?.({
					drawingBase64: nextDrawing,
					textBlocks: nextBlocks,
					mergedBase64: nextMerged,
				})
				onChange?.(nextMerged)
				onTextChange?.(nextBlocks)
			},
			[onChange, onNotesChange, onTextChange]
		)

		const requestMergedSnapshot = useCallback(
			(blocks = textBlocksRef.current, fallbackMerged = drawingBase64Ref.current) => {
				const wv = webRef.current
				if (!wv || !webViewReady) {
					mergedBase64Ref.current = fallbackMerged
					setMergedBase64(fallbackMerged)
					if (isMounted) notifyChange(drawingBase64Ref.current, blocks, fallbackMerged)
					return
				}

				const js = `
          (function() {
            var sourceCanvas = document.querySelector('canvas');
            if (!sourceCanvas) return true;
            var exportCanvas = document.createElement('canvas');
            exportCanvas.width = sourceCanvas.width;
            exportCanvas.height = sourceCanvas.height;
            var ctx = exportCanvas.getContext('2d');
            ctx.fillStyle = '#fafafa';
            ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            ctx.drawImage(sourceCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
            var blocks = ${JSON.stringify(blocks)};
            var scaleX = exportCanvas.width / ${SCREEN_WIDTH};
            var scaleY = exportCanvas.height / ${CANVAS_HEIGHT};
            blocks.forEach(function(block) {
              var text = String(block.text || '');
              if (!text.trim()) return;
              var fontSize = (block.fontSize || ${DEFAULT_FONT_SIZE}) * scaleY;
              var lineHeight = ${LINE_HEIGHT} * scaleY;
              var x = block.x * scaleX;
              var y = (block.y * scaleY) + fontSize;
              var maxWidth = (block.width || ${DEFAULT_TEXT_BOX_WIDTH}) * scaleX;
              var words = text.split(/\\s+/);
              var line = '';
              ctx.save();
              ctx.font = fontSize + 'px sans-serif';
              ctx.fillStyle = block.color || '${TEXT_COLOR}';
              ctx.textBaseline = 'alphabetic';
              for (var i = 0; i < words.length; i++) {
                var testLine = line ? line + ' ' + words[i] : words[i];
                if (ctx.measureText(testLine).width > maxWidth && line) {
                  ctx.fillText(line, x, y);
                  y += lineHeight;
                  line = words[i];
                } else {
                  line = testLine;
                }
              }
              if (line) ctx.fillText(line, x, y);
              ctx.restore();
            });
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mergedSnapshot',
              data: exportCanvas.toDataURL('image/png')
            }));
            return true;
          })();
          true;
        `
				wv.injectJavaScript(js)
			},
			[notifyChange, webViewReady, isMounted]
		)

		const handleWebViewMessage = useCallback(
			(event: any) => {
				try {
					const parsed = JSON.parse(event.nativeEvent.data)
					if (
						parsed?.type === 'mergedSnapshot' &&
						typeof parsed.data === 'string' &&
						parsed.data.startsWith('data:image')
					) {
						mergedBase64Ref.current = parsed.data
						setMergedBase64(parsed.data)
						if (isMounted) notifyChange(drawingBase64Ref.current, textBlocksRef.current, parsed.data)
					}
				} catch {
					// ignore
				}
			},
			[notifyChange, isMounted]
		)

		const restoreDrawing = useCallback(
			(dataURL: string) => {
				const wv = webRef.current
				if (!wv || !webViewReady) {
					pendingRestoreRef.current = dataURL
					return
				}
				if (!dataURL) {
					if (webViewReady) sigRef.current?.clearSignature()
					return
				}
				const js = `
          (function() {
            var canvas = document.querySelector('canvas');
            if (!canvas) return true;
            var ctx = canvas.getContext('2d');
            var img = new Image();
            img.onload = function() {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = ${JSON.stringify(dataURL)};
            return true;
          })();
          true;
        `
				wv.injectJavaScript(js)
			},
			[webViewReady]
		)

		const setBlocksAndNotify = useCallback(
			(updater: (previous: TextBlock[]) => TextBlock[], skipHistory = false, skipMerge = false) => {
				setTextBlocks((prev) => {
					const rawUpdated = updater(prev).map(normalizeBlock)
					const updated = layoutTextBlocks(rawUpdated)
					textBlocksRef.current = updated
					if (!skipHistory && !isUndoRedoRef.current) {
						pushCombinedHistory(drawingBase64Ref.current, updated)
					}
					if (!skipMerge) {
						requestMergedSnapshot(updated, drawingBase64Ref.current)
					} else if (isMounted) {
						notifyChange(drawingBase64Ref.current, updated, mergedBase64Ref.current)
					}
					return updated
				})
			},
			[pushCombinedHistory, requestMergedSnapshot, notifyChange, isMounted]
		)

		const updateDrawing = useCallback(
			(newDrawing: string) => {
				if (newDrawing === drawingBase64Ref.current) return
				drawingBase64Ref.current = newDrawing
				setDrawingBase64(newDrawing)
				if (!isUndoRedoRef.current) {
					pushCombinedHistory(newDrawing, textBlocksRef.current)
				}
				requestMergedSnapshot(textBlocksRef.current, newDrawing)
				if (isMounted) notifyChange(newDrawing, textBlocksRef.current, mergedBase64Ref.current)
			},
			[pushCombinedHistory, requestMergedSnapshot, notifyChange, isMounted]
		)

		const undo = useCallback(() => {
			if (historyIndexRef.current <= 0) return
			isUndoRedoRef.current = true
			const newIdx = historyIndexRef.current - 1
			const snapshot = historyStackRef.current[newIdx]
			if (snapshot) {
				drawingBase64Ref.current = snapshot.drawing
				setDrawingBase64(snapshot.drawing)
				restoreDrawing(snapshot.drawing)
				const relayoutBlocks = layoutTextBlocks(snapshot.blocks)
				textBlocksRef.current = relayoutBlocks
				setTextBlocks(relayoutBlocks)
				historyIndexRef.current = newIdx
				setHistoryIndex(newIdx)
				requestMergedSnapshot(relayoutBlocks, snapshot.drawing)
				if (isMounted) notifyChange(snapshot.drawing, relayoutBlocks, mergedBase64Ref.current)
			}
			setTimeout(() => {
				isUndoRedoRef.current = false
			}, 100)
		}, [restoreDrawing, requestMergedSnapshot, notifyChange, isMounted])

		const redo = useCallback(() => {
			if (historyIndexRef.current >= historyStackRef.current.length - 1) return
			isUndoRedoRef.current = true
			const newIdx = historyIndexRef.current + 1
			const snapshot = historyStackRef.current[newIdx]
			if (snapshot) {
				drawingBase64Ref.current = snapshot.drawing
				setDrawingBase64(snapshot.drawing)
				restoreDrawing(snapshot.drawing)
				const relayoutBlocks = layoutTextBlocks(snapshot.blocks)
				textBlocksRef.current = relayoutBlocks
				setTextBlocks(relayoutBlocks)
				historyIndexRef.current = newIdx
				setHistoryIndex(newIdx)
				requestMergedSnapshot(relayoutBlocks, snapshot.drawing)
				if (isMounted) notifyChange(snapshot.drawing, relayoutBlocks, mergedBase64Ref.current)
			}
			setTimeout(() => {
				isUndoRedoRef.current = false
			}, 100)
		}, [restoreDrawing, requestMergedSnapshot, notifyChange, isMounted])

		useImperativeHandle(
			ref,
			() => ({
				getNotesData: () => ({
					drawingBase64: drawingBase64Ref.current,
					textBlocks: textBlocksRef.current,
					mergedBase64: mergedBase64Ref.current,
				}),
				clearAll: () => {
					if (webViewReady) sigRef.current?.clearSignature()
					drawingBase64Ref.current = BLANK_CANVAS
					mergedBase64Ref.current = BLANK_CANVAS
					setDrawingBase64(BLANK_CANVAS)
					setMergedBase64(BLANK_CANVAS)
					setTextBlocks([])
					textBlocksRef.current = []
					pushCombinedHistory(BLANK_CANVAS, [])
					requestMergedSnapshot([], BLANK_CANVAS)
					if (isMounted) notifyChange(BLANK_CANVAS, [], BLANK_CANVAS)
				},
				undo,
				redo,
			}),
			[undo, redo, pushCombinedHistory, requestMergedSnapshot, notifyChange, webViewReady, isMounted]
		)

		useEffect(() => {
			const initialBlocksLayout = layoutTextBlocks(initialTextBlocks.map(normalizeBlock))
			textBlocksRef.current = initialBlocksLayout
			setTextBlocks(initialBlocksLayout)
			drawingBase64Ref.current = initialDrawingBase64 || BLANK_CANVAS
			setDrawingBase64(initialDrawingBase64 || BLANK_CANVAS)
			const initialEntry = {
				drawing: initialDrawingBase64 || BLANK_CANVAS,
				blocks: initialBlocksLayout,
			}
			historyStackRef.current = [initialEntry]
			historyIndexRef.current = 0
			setHistoryStack([initialEntry])
			setHistoryIndex(0)
			if (initialDrawingBase64) {
				pendingRestoreRef.current = initialDrawingBase64
			}
			setIsMounted(true)
		}, [])

		useEffect(() => {
			if (!webViewReady) return
			if (pendingRestoreRef.current !== null) {
				restoreDrawing(pendingRestoreRef.current)
				pendingRestoreRef.current = null
				setTimeout(() => requestMergedSnapshot(textBlocksRef.current, drawingBase64Ref.current), 220)
			}
		}, [webViewReady, restoreDrawing, requestMergedSnapshot])

		const handleStrokeEnd = useCallback(() => {
			sigRef.current?.readSignature()
		}, [])

		const onSignatureOk = useCallback(
			(signature: string) => {
				if (signature && signature !== drawingBase64Ref.current) {
					updateDrawing(signature)
				}
			},
			[updateDrawing]
		)

		const addTextBlock = useCallback(
			(text: string) => {
				const cleanText = text.trim()
				if (!cleanText) return
				const newBlock: TextBlock = {
					id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
					text: cleanText,
					x: TEXT_PAD,
					y: START_Y,
					fontSize: DEFAULT_FONT_SIZE,
					color: TEXT_COLOR,
					width: DEFAULT_TEXT_BOX_WIDTH,
					createdAt: Date.now(),
				}
				setBlocksAndNotify((prev) => [...prev, newBlock])
			},
			[setBlocksAndNotify]
		)

		const editBlock = useCallback(
			(id: string, newText: string) => {
				if (!newText.trim()) return
				setBlocksAndNotify((prev) => prev.map((b) => (b.id === id ? { ...b, text: newText.trim() } : b)))
			},
			[setBlocksAndNotify]
		)

		const deleteBlock = useCallback(
			(id: string) => {
				Alert.alert('Delete text', 'Remove this text block?', [
					{ text: 'Cancel', style: 'cancel' },
					{
						text: 'Delete',
						style: 'destructive',
						onPress: () => setBlocksAndNotify((prev) => prev.filter((b) => b.id !== id)),
					},
				])
			},
			[setBlocksAndNotify]
		)

		useSpeechRecognitionEvent('result', (event) => {
			const first = event.results?.[0]
			if (!first) return
			if (!event.isFinal) {
				setLiveText(first.transcript)
				return
			}
			const chunk = first.transcript.trim()
			if (chunk) {
				setLiveText('')
				addTextBlock(chunk)
			}
		})

		useSpeechRecognitionEvent('end', () => {
			if (isListeningRef.current && !userStoppedRef.current) {
				setTimeout(() => {
					if (isListeningRef.current && !userStoppedRef.current) {
						ExpoSpeechRecognitionModule.start({
							lang: 'en-US',
							interimResults: true,
							continuous: false,
						})
					}
				}, 250)
			}
			userStoppedRef.current = false
		})

		useSpeechRecognitionEvent('error', () => {
			if (isListeningRef.current && !userStoppedRef.current) {
				setTimeout(() => {
					if (isListeningRef.current && !userStoppedRef.current) {
						ExpoSpeechRecognitionModule.start({
							lang: 'en-US',
							interimResults: true,
							continuous: false,
						})
					}
				}, 400)
			}
		})

		const startListening = async () => {
			const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
			if (!perm.granted) {
				Alert.alert('Permission required', 'Enable microphone to use speech')
				return
			}
			userStoppedRef.current = false
			isListeningRef.current = true
			setIsListening(true)
			ExpoSpeechRecognitionModule.start({
				lang: 'en-US',
				interimResults: true,
				continuous: false,
			})
		}

		const stopListening = () => {
			userStoppedRef.current = true
			isListeningRef.current = false
			setIsListening(false)
			setLiveText('')
			ExpoSpeechRecognitionModule.stop()
		}

		const toggleMic = () => {
			if (isListening) stopListening()
			else startListening()
		}

		const clearDrawingOnly = () => {
			if (webViewReady) sigRef.current?.clearSignature()
			updateDrawing(BLANK_CANVAS)
		}

		const clearEverything = () => {
			if (webViewReady) sigRef.current?.clearSignature()
			updateDrawing(BLANK_CANVAS)
			setBlocksAndNotify(() => [], false, false)
			pushCombinedHistory(BLANK_CANVAS, [])
			requestMergedSnapshot([], BLANK_CANVAS)
		}

		const handleClearCanvas = () => {
			Alert.alert('Clear canvas', 'What do you want to clear?', [
				{ text: 'Cancel', style: 'cancel' },
				{ text: 'Drawing only', onPress: clearDrawingOnly },
				{ text: 'Clear all', style: 'destructive', onPress: clearEverything },
			])
		}

		const pulseAnim = useRef(new Animated.Value(1)).current
		const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)

		useEffect(() => {
			if (isListening) {
				pulseLoop.current = Animated.loop(
					Animated.sequence([
						Animated.timing(pulseAnim, {
							toValue: 1.45,
							duration: 550,
							easing: Easing.inOut(Easing.ease),
							useNativeDriver: true,
						}),
						Animated.timing(pulseAnim, {
							toValue: 1,
							duration: 550,
							easing: Easing.inOut(Easing.ease),
							useNativeDriver: true,
						}),
					])
				)
				pulseLoop.current.start()
			} else {
				pulseLoop.current?.stop()
				pulseAnim.setValue(1)
			}
			return () => pulseLoop.current?.stop()
		}, [isListening, pulseAnim])

		const addTypedText = () => {
			if (!newTextValue.trim()) {
				Alert.alert('Error', 'Please enter some text')
				return
			}
			addTextBlock(newTextValue)
			setShowTextInput(false)
			setNewTextValue('')
		}

		const webStyle = `
      .m-signature-pad {
        box-shadow: none;
        border: none;
        overflow: hidden;
        touch-action: none;
      }
      .m-signature-pad--body {
        border: none;
        overflow: hidden;
        touch-action: none;
      }
      .m-signature-pad--footer {
        display: none;
      }
      html, body {
        background: #fafafa;
        margin: 0;
        padding: 0;
        overflow: hidden;
        position: fixed;
        width: 100%;
        height: 100%;
        overscroll-behavior: none;
        touch-action: none;
      }
      canvas {
        background: #fafafa;
        display: block;
        width: 100% !important;
        height: 100% !important;
        touch-action: none;
      }
      * {
        user-select: none;
        -webkit-touch-callout: none;
      }
    `

		const renderTextBlock = (block: TextBlock) => (
			<TouchableOpacity
				key={block.id}
				activeOpacity={0.85}
				onPress={() => {
					setEditingBlock(block)
					setEditTextValue(block.text)
				}}
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				style={[
					styles.canvasTextBlock,
					{
						left: block.x,
						top: block.y,
						width: block.width,
					},
				]}
			>
				<Text
					style={[
						styles.canvasText,
						{ fontSize: block.fontSize, color: block.color, lineHeight: LINE_HEIGHT },
					]}
				>
					{block.text}
				</Text>
				<TouchableOpacity
					style={styles.deleteTextBtn}
					onPress={() => deleteBlock(block.id)}
					hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
				>
					<MaterialCommunityIcons name="close-circle" size={16} color="#999" />
				</TouchableOpacity>
			</TouchableOpacity>
		)

		const isEmpty = drawingBase64 === BLANK_CANVAS && textBlocks.length === 0

		return (
			<View style={styles.wrapper}>
				{/* Mode selector */}
				<View style={styles.modeRow}>
					{(['draw', 'speech', 'text'] as Mode[]).map((item) => (
						<TouchableOpacity
							key={item}
							style={[
								styles.modeBtn,
								mode === item && { backgroundColor: accentColor, borderColor: accentColor },
							]}
							onPress={() => {
								if (mode === 'speech' && isListening) stopListening()
								setMode(item)
								if (item !== 'text') setShowTextInput(false)
							}}
						>
							<MaterialCommunityIcons
								name={item === 'draw' ? 'pencil' : item === 'speech' ? 'microphone' : 'text'}
								size={14}
								color={mode === item ? '#fff' : '#666'}
							/>
							<Text style={[styles.modeBtnText, mode === item && { color: '#fff' }]}>
								{item === 'draw' ? 'Draw' : item === 'speech' ? 'Speech' : 'Text'}
							</Text>
						</TouchableOpacity>
					))}
				</View>

				<Divider />

				{/* Draw toolbar with undo/redo */}
				{mode === 'draw' && (
					<View style={styles.toolbar}>
						{['#1a237e'].map((color) => (
							<TouchableOpacity
								key={color}
								onPress={() => {
									setPenColor(color)
									setIsEraser(false)
								}}
								style={[
									styles.colorDot,
									{ backgroundColor: color },
									penColor === color && !isEraser && styles.colorDotActive,
								]}
							/>
						))}
						<View style={styles.sep} />
						{[
							{ size: 2, dot: 6 },
							{ size: 4, dot: 10 },
							{ size: 7, dot: 14 },
						].map(({ size, dot }) => (
							<TouchableOpacity key={size} onPress={() => setPenSize(size)} style={styles.tbBtn}>
								<View
									style={{
										width: dot,
										height: dot,
										borderRadius: dot / 2,
										backgroundColor: isEraser ? '#ccc' : penColor,
										opacity: penSize === size ? 1 : 0.3,
									}}
								/>
							</TouchableOpacity>
						))}
						<View style={styles.sep} />
						<TouchableOpacity
							onPress={() => setIsEraser((v) => !v)}
							style={[styles.tbBtn, isEraser && styles.tbBtnActive]}
						>
							<MaterialCommunityIcons name="eraser" size={18} color={isEraser ? accentColor : '#555'} />
						</TouchableOpacity>
						<TouchableOpacity onPress={undo} style={styles.tbBtn}>
							<MaterialCommunityIcons name="undo" size={20} color={historyIndex > 0 ? '#333' : '#ccc'} />
						</TouchableOpacity>
						<TouchableOpacity onPress={redo} style={styles.tbBtn}>
							<MaterialCommunityIcons
								name="redo"
								size={20}
								color={historyIndex < historyStack.length - 1 ? '#333' : '#ccc'}
							/>
						</TouchableOpacity>
						<TouchableOpacity onPress={handleClearCanvas} style={styles.tbBtn}>
							<MaterialCommunityIcons name="delete-outline" size={18} color="#c62828" />
						</TouchableOpacity>
					</View>
				)}

				{/* Speech toolbar */}
				{mode === 'speech' && (
					<View style={styles.speechBar}>
						<TouchableOpacity onPress={toggleMic} style={styles.micWrap}>
							<Animated.View
								style={[
									styles.micRing,
									{
										transform: [{ scale: pulseAnim }],
										backgroundColor: isListening ? '#ffcdd2' : 'transparent',
									},
								]}
							/>
							<View style={[styles.micBtn, { backgroundColor: isListening ? '#e53935' : accentColor }]}>
								<MaterialCommunityIcons
									name={isListening ? 'microphone' : 'microphone-outline'}
									size={22}
									color="#fff"
								/>
							</View>
						</TouchableOpacity>
						<View style={styles.speechCopy}>
							{isListening ? (
								<View style={styles.recordingRow}>
									<View style={styles.recDot} />
									<Text style={styles.recLabel}>Recording… tap to stop</Text>
								</View>
							) : (
								<Text style={styles.speechHint}>
									Tap mic and speak. Text will be stacked automatically.
								</Text>
							)}
						</View>
						<TouchableOpacity onPress={handleClearCanvas} style={styles.tbBtn}>
							<MaterialCommunityIcons name="delete-outline" size={18} color="#c62828" />
						</TouchableOpacity>
					</View>
				)}

				{/* Text mode toolbar */}
				{mode === 'text' && (
					<View style={styles.textModeBar}>
						<MaterialCommunityIcons name="cursor-text" size={15} color="#666" />
						<Text style={styles.textModeHint}>Add a new text block below existing ones</Text>
						<TouchableOpacity
							onPress={() => {
								setNewTextValue('')
								setShowTextInput(true)
							}}
							style={[styles.addTextBtn, { backgroundColor: accentColor }]}
						>
							<MaterialCommunityIcons name="plus" size={18} color="#fff" />
						</TouchableOpacity>
						<TouchableOpacity onPress={handleClearCanvas} style={styles.tbBtn}>
							<MaterialCommunityIcons name="delete-outline" size={18} color="#c62828" />
						</TouchableOpacity>
					</View>
				)}

				{/* Live speech bubble */}
				{mode === 'speech' && isListening && liveText !== '' && (
					<View style={[styles.liveBubble, { borderColor: accentColor }]}>
						<MaterialCommunityIcons name="waveform" size={13} color={accentColor} />
						<Text style={[styles.liveBubbleText, { color: accentColor }]} numberOfLines={2}>
							{liveText}
						</Text>
					</View>
				)}

				<Divider />

				{/* Canvas area – fixed height */}
				<View
					style={styles.canvasTouchWrapper}
					onTouchStart={handleInteractionStart}
					onTouchEnd={handleInteractionEnd}
					onTouchCancel={handleInteractionEnd}
				>
					<View style={styles.canvasWrap}>
						<View style={styles.signatureLayer} pointerEvents={mode === 'draw' ? 'auto' : 'none'}>
							<SignatureCanvas
								ref={sigRef}
								onOK={onSignatureOk}
								onEnd={handleStrokeEnd}
								descriptionText=""
								clearText=""
								confirmText=""
								webStyle={webStyle}
								penColor={isEraser ? '#fafafa' : penColor}
								minWidth={penSize}
								maxWidth={penSize + 1}
								style={styles.signatureCanvas}
								backgroundColor="#fafafa"
								autoClear={false}
								dataURL={drawingBase64 || undefined}
								webviewProps={{
									ref: webRef,
									scrollEnabled: false,
									nestedScrollEnabled: false,
									showsHorizontalScrollIndicator: false,
									showsVerticalScrollIndicator: false,
									bounces: false,
									overScrollMode: 'never',
									style: styles.webView,
									onTouchStart: (event: any) => {
										event.stopPropagation?.()
										handleInteractionStart()
									},
									onTouchMove: (event: any) => event.stopPropagation?.(),
									onTouchEnd: (event: any) => {
										event.stopPropagation?.()
										handleInteractionEnd()
									},
									onTouchCancel: (event: any) => {
										event.stopPropagation?.()
										handleInteractionEnd()
									},
									onMessage: handleWebViewMessage,
									onLoadEnd: () => {
										setWebViewReady(true)
										webRef.current?.injectJavaScript(`
                      document.documentElement.style.overflow = 'hidden';
                      document.body.style.overflow = 'hidden';
                      true;
                    `)
									},
								}}
							/>
						</View>

						<View style={styles.textBlocksLayer} pointerEvents="box-none">
							{textBlocks.map(renderTextBlock)}
						</View>

						{isEmpty && (
							<View style={styles.emptyHint} pointerEvents="none">
								<MaterialCommunityIcons name="gesture" size={38} color="#ececec" />
								<Text style={styles.emptyHintText}>
									{mode === 'draw'
										? 'Draw your notes here'
										: mode === 'speech'
											? 'Spoken text will appear here (stacked)'
											: 'Tap + to add text blocks'}
								</Text>
							</View>
						)}
					</View>
				</View>

				{/* Modals */}
				<Modal
					visible={showTextInput}
					transparent
					animationType="fade"
					onRequestClose={() => setShowTextInput(false)}
				>
					<KeyboardAvoidingView
						style={styles.modalOverlay}
						behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					>
						<View style={styles.modalCard}>
							<Text style={styles.modalTitle}>Add text block</Text>
							<TextInput
								style={styles.textInput}
								value={newTextValue}
								onChangeText={setNewTextValue}
								multiline
								autoFocus
								placeholder="Type your text here..."
							/>
							<View style={styles.modalButtons}>
								<Button mode="outlined" onPress={() => setShowTextInput(false)}>
									Cancel
								</Button>
								<Button
									mode="contained"
									onPress={addTypedText}
									style={{ backgroundColor: accentColor }}
								>
									Add
								</Button>
							</View>
						</View>
					</KeyboardAvoidingView>
				</Modal>

				<Modal
					visible={!!editingBlock}
					transparent
					animationType="fade"
					onRequestClose={() => setEditingBlock(null)}
				>
					<KeyboardAvoidingView
						style={styles.modalOverlay}
						behavior={Platform.OS === 'ios' ? 'padding' : undefined}
					>
						<View style={styles.modalCard}>
							<Text style={styles.modalTitle}>Edit text</Text>
							<TextInput
								style={styles.textInput}
								value={editTextValue}
								onChangeText={setEditTextValue}
								multiline
								autoFocus
								placeholder="Edit text..."
							/>
							<View style={styles.modalButtons}>
								<Button mode="outlined" onPress={() => setEditingBlock(null)}>
									Cancel
								</Button>
								<Button
									mode="contained"
									onPress={() => {
										if (editingBlock) {
											editBlock(editingBlock.id, editTextValue)
											setEditingBlock(null)
										}
									}}
									style={{ backgroundColor: accentColor }}
								>
									Save
								</Button>
							</View>
						</View>
					</KeyboardAvoidingView>
				</Modal>
			</View>
		)
	}
)

const styles = StyleSheet.create({
	wrapper: { overflow: 'hidden', backgroundColor: '#fff' },
	modeRow: { flexDirection: 'row', alignItems: 'center', padding: 8, gap: 8 },
	modeBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 5,
		paddingHorizontal: 12,
		borderRadius: 20,
		borderWidth: 1.5,
		borderColor: '#d0d0d0',
		gap: 5,
	},
	modeBtnText: { fontSize: 12, color: '#555' },
	modeHint: { fontSize: 10, color: '#777', flex: 1, flexShrink: 1 },
	toolbar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 8,
		backgroundColor: '#fafafa',
		gap: 6,
		flexWrap: 'wrap',
	},
	colorDot: { width: 20, height: 20, borderRadius: 10 },
	colorDotActive: {
		borderWidth: 3,
		borderColor: '#fff',
		shadowColor: '#000',
		shadowOpacity: 0.35,
		shadowRadius: 3,
		elevation: 4,
	},
	sep: { width: 1, height: 22, backgroundColor: '#e0e0e0', marginHorizontal: 2 },
	tbBtn: { padding: 4 },
	tbBtnActive: { backgroundColor: '#e0f2f1', borderRadius: 6 },
	speechBar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: '#fafafa',
		gap: 10,
	},
	textModeBar: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 10,
		backgroundColor: '#fafafa',
		gap: 8,
	},
	textModeHint: { fontSize: 11, color: '#777', flex: 1 },
	addTextBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
	micWrap: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
	micRing: { position: 'absolute', width: 46, height: 46, borderRadius: 23 },
	micBtn: {
		width: 38,
		height: 38,
		borderRadius: 19,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 3,
		shadowColor: '#000',
		shadowOpacity: 0.18,
		shadowRadius: 4,
	},
	speechCopy: { flex: 1 },
	recordingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
	recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e53935' },
	recLabel: { fontSize: 11, color: '#e53935', fontWeight: '500' },
	speechHint: { fontSize: 11, color: '#777' },
	liveBubble: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: 12,
		marginVertical: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		borderWidth: 1,
		backgroundColor: '#f1f8e9',
		gap: 6,
	},
	liveBubbleText: { fontSize: 12, fontStyle: 'italic', flex: 1 },
	canvasTouchWrapper: { height: CANVAS_HEIGHT, overflow: 'hidden' },
	canvasWrap: { height: CANVAS_HEIGHT, backgroundColor: '#fafafa', position: 'relative', overflow: 'hidden' },
	signatureLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
	signatureCanvas: { flex: 1, height: CANVAS_HEIGHT },
	webView: { flex: 1, height: CANVAS_HEIGHT, backgroundColor: '#fafafa' },
	textBlocksLayer: { ...StyleSheet.absoluteFillObject, zIndex: 30 },
	canvasTextBlock: {
		position: 'absolute',
		zIndex: 8,
		minHeight: LINE_HEIGHT,
		overflow: 'visible',
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: 'rgba(255,255,240,0.85)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
	},
	canvasText: { flex: 1, flexWrap: 'wrap', includeFontPadding: false },
	deleteTextBtn: { marginLeft: 6, paddingLeft: 4 },
	emptyHint: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		opacity: 0.4,
	},
	emptyHintText: { fontSize: 11, color: '#aaa', marginTop: 6 },
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	modalCard: { width: '100%', maxWidth: 460, backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 5 },
	modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
	textInput: {
		borderWidth: 1,
		borderColor: '#ccc',
		borderRadius: 8,
		padding: 10,
		minHeight: 90,
		maxHeight: 180,
		textAlignVertical: 'top',
		marginBottom: 16,
	},
	modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
})

export default ScribbleNoteEditor
