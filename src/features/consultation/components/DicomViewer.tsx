import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';

interface DicomViewerProps {
  base64Data: string | null;
  fullScreen?: boolean;
}

const CORNERSTONE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%;
      background: #000;
      display: flex; align-items: center; justify-content: center;
      overflow: hidden;
    }
    #dicomCanvas {
      width: 100%; height: 100%;
      touch-action: none;
    }
    #statusMsg {
      position: absolute;
      color: #aaa;
      font-family: monospace;
      font-size: 13px;
      text-align: center;
      padding: 16px;
    }
    #controls {
      position: absolute;
      bottom: 8px;
      right: 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ctrl-btn {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 18px;
      cursor: pointer;
      line-height: 1;
    }
    .ctrl-btn:active { background: rgba(255,255,255,0.3); }
    #infoOverlay {
      position: absolute;
      top: 8px;
      left: 8px;
      color: #4fc3f7;
      font-family: monospace;
      font-size: 10px;
      line-height: 1.5;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="statusMsg">Loading DICOM viewer...</div>
  <div id="dicomCanvas"></div>
  <div id="infoOverlay"></div>
  <div id="controls" style="display:none">
    <button class="ctrl-btn" onclick="zoomIn()">＋</button>
    <button class="ctrl-btn" onclick="zoomOut()">－</button>
    <button class="ctrl-btn" onclick="resetView()">⊙</button>
    <button class="ctrl-btn" onclick="invertImage()">☀</button>
  </div>

  <!-- Cornerstone Core -->
  <script src="https://cdn.jsdelivr.net/npm/cornerstone-core@2.6.1/dist/cornerstone.min.js" integrity="sha384-g7W7PJNIdGATX0lWeJoQcFZsdPs8U5VDD+xSYSnyeC2Q5kqHI0WeA2l7f+PZik+G" crossorigin="anonymous"></script>
  <!-- dicomParser -->
  <script src="https://cdn.jsdelivr.net/npm/dicom-parser@1.8.21/dist/dicomParser.min.js" integrity="sha384-Z8ua3fbU1i9fPqw0gGLF0aw6yqnTK3GO6R9CFvnlvXB0x0AIFi6JqYvQ6v+s9kuw" crossorigin="anonymous"></script>
  <!-- cornerstoneWADOImageLoader (with worker-less config) -->
  <script src="https://cdn.jsdelivr.net/npm/cornerstone-wado-image-loader@4.13.2/dist/cornerstoneWADOImageLoader.bundle.min.js" integrity="sha384-OGK5yRQLrQXDnbZRuhdKZncm0S8Lue2KRds62VusVCcEXVdpxu7zStnWB2uNFYFw" crossorigin="anonymous"></script>

  <script>
    var element = document.getElementById('dicomCanvas');
    var statusMsg = document.getElementById('statusMsg');
    var infoOverlay = document.getElementById('infoOverlay');
    var currentViewport = null;
    var imageLoaded = false;
    var currentImageId = null;

    // Configure wado image loader
    cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
    cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
    cornerstoneWADOImageLoader.configure({
      useWebWorkers: false,
    });

    // Enable the cornerstone element
    cornerstone.enable(element);

    function setStatus(msg) {
      statusMsg.textContent = msg;
      statusMsg.style.display = msg ? 'block' : 'none';
    }

    function updateInfoOverlay(image) {
      try {
        var vp = cornerstone.getViewport(element);
        infoOverlay.innerHTML =
          'W: ' + Math.round(vp.voi.windowWidth) + '<br>' +
          'L: ' + Math.round(vp.voi.windowCenter) + '<br>' +
          'Zoom: ' + vp.scale.toFixed(2) + 'x';
      } catch(e) {
        // overlay is cosmetic; viewport may not exist yet
      }
    }

    function loadDicomFromBase64(base64String) {
      setStatus('Decoding DICOM data...');
      try {
        // Decode base64 to binary
        var binaryString = atob(base64String);
        var bytes = new Uint8Array(binaryString.length);
        for (var i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        var blob = new Blob([bytes], { type: 'application/dicom' });
        var objectUrl = URL.createObjectURL(blob);
        currentImageId = 'wadouri:' + objectUrl;

        setStatus('Rendering scan...');
        cornerstone.loadAndCacheImage(currentImageId).then(function(image) {
          setStatus('');
          document.getElementById('controls').style.display = 'flex';
          imageLoaded = true;
          cornerstone.displayImage(element, image);
          currentViewport = cornerstone.getViewport(element);
          updateInfoOverlay(image);
        }).catch(function(err) {
          setStatus('Error rendering DICOM: ' + err.message);
          console.error(err);
        });
      } catch(err) {
        setStatus('Error decoding data: ' + err.message);
        console.error(err);
      }
    }

    // Mouse/touch interactions: W/L adjustment on drag
    var lastX = null, lastY = null, isDragging = false;
    element.addEventListener('mousedown', function(e) { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
    element.addEventListener('mousemove', function(e) {
      if (!isDragging || !imageLoaded) return;
      var dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      adjustWL(dx * 2, -dy * 2);
    });
    element.addEventListener('mouseup', function() { isDragging = false; });

    element.addEventListener('touchstart', function(e) {
      isDragging = true;
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
    }, { passive: true });
    element.addEventListener('touchmove', function(e) {
      if (!isDragging || !imageLoaded) return;
      var dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
      lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
      adjustWL(dx * 2, -dy * 2);
    }, { passive: true });
    element.addEventListener('touchend', function() { isDragging = false; });

    function adjustWL(dWidth, dCenter) {
      try {
        var vp = cornerstone.getViewport(element);
        vp.voi.windowWidth = Math.max(1, vp.voi.windowWidth + dWidth);
        vp.voi.windowCenter = vp.voi.windowCenter + dCenter;
        cornerstone.setViewport(element, vp);
        updateInfoOverlay();
      } catch(e) {
        // viewport may not be ready; ignore this drag tick
      }
    }

    function zoomIn() {
      try {
        var vp = cornerstone.getViewport(element);
        vp.scale = Math.min(vp.scale * 1.25, 8);
        cornerstone.setViewport(element, vp);
        updateInfoOverlay();
      } catch(e) {
        // viewport may not be ready; ignore this zoom
      }
    }

    function zoomOut() {
      try {
        var vp = cornerstone.getViewport(element);
        vp.scale = Math.max(vp.scale * 0.8, 0.1);
        cornerstone.setViewport(element, vp);
        updateInfoOverlay();
      } catch(e) {
        // viewport may not be ready; ignore this zoom
      }
    }

    function resetView() {
      try {
        if (currentViewport) {
          cornerstone.setViewport(element, JSON.parse(JSON.stringify(currentViewport)));
          updateInfoOverlay();
        }
      } catch(e) {
        // viewport may not be ready; nothing to reset
      }
    }

    function invertImage() {
      try {
        var vp = cornerstone.getViewport(element);
        vp.invert = !vp.invert;
        cornerstone.setViewport(element, vp);
      } catch(e) {
        // viewport may not be ready; nothing to invert
      }
    }

    // Listen for Base64 payload from React Native
    document.addEventListener('message', function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'DICOM_BASE64') {
          loadDicomFromBase64(msg.data);
        }
      } catch(e) {
        console.error('Message parse error:', e);
      }
    });

    // Also handle window.postMessage (iOS)
    window.addEventListener('message', function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'DICOM_BASE64') {
          loadDicomFromBase64(msg.data);
        }
      } catch(e) {
        // ignore non-JSON messages from other senders
      }
    });

    setStatus('Waiting for DICOM data...');
  </script>
</body>
</html>
`;

export default function DicomViewer({ base64Data, fullScreen = false }: DicomViewerProps) {
  const webViewRef = useRef<WebView>(null);
  const [webViewReady, setWebViewReady] = useState(false);
  const pendingDataRef = useRef<string | null>(null);

  // When base64Data arrives and WebView is ready, post the message
  useEffect(() => {
    if (!base64Data) return;
    if (webViewReady && webViewRef.current) {
      sendDicomData(base64Data);
    } else {
      // Store to send once WebView signals ready
      pendingDataRef.current = base64Data;
    }
  }, [base64Data, webViewReady]);

  function sendDicomData(data: string) {
    const message = JSON.stringify({ type: 'DICOM_BASE64', data });
    webViewRef.current?.postMessage(message);
  }

  function handleWebViewLoad() {
    // Give scripts a moment to initialise before injecting
    setTimeout(() => {
      setWebViewReady(true);
      if (pendingDataRef.current) {
        sendDicomData(pendingDataRef.current);
        pendingDataRef.current = null;
      }
    }, 800);
  }

  return (
    <View style={[styles.container, fullScreen && styles.containerFullScreen]}>
      {!base64Data && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4fc3f7" />
          <Text style={styles.loadingText}>Loading DICOM file...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        style={styles.webview}
        // The viewer is an inline HTML string: it needs no file access, no storage and
        // no navigation anywhere. The PHI (the DICOM bytes) is posted into this page, so
        // keep the page as locked down as the CDN scripts above (pinned + SRI) allow.
        originWhitelist={['about:*']}
        source={{ html: CORNERSTONE_HTML }}
        onLoad={handleWebViewLoad}
        javaScriptEnabled
        domStorageEnabled={false}
        allowFileAccess={false}
        mixedContentMode="never"
        onError={(e) => console.warn('WebView error:', e.nativeEvent)}
        onMessage={__DEV__ ? (e) => console.log('WebView log:', e.nativeEvent.data) : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 320,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  containerFullScreen: {
    height: '100%',
    borderRadius: 0,
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    zIndex: 10,
  },
  loadingText: {
    color: '#aaa',
    marginTop: 10,
    fontFamily: 'monospace',
    fontSize: 12,
  },
});
