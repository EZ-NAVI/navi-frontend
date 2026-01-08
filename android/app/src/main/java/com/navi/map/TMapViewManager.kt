package com.eznavi.app.map

import android.graphics.BitmapFactory
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Bundle
import android.util.Log
import android.graphics.PointF
import android.view.View
import android.view.accessibility.AccessibilityEvent
import androidx.core.view.ViewCompat
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat
import androidx.customview.widget.ExploreByTouchHelper
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.eznavi.app.R
import com.skt.tmap.TMapData
import com.skt.tmap.TMapPoint
import com.skt.tmap.TMapView
import com.skt.tmap.overlay.TMapMarkerItem
import com.skt.tmap.overlay.TMapPolyLine
import com.skt.tmap.poi.TMapPOIItem

// 마커 정보를 저장하는 데이터 클래스
data class MarkerInfo(
    val id: String,
    val lat: Double,
    val lon: Double,
    val label: String
)

// TMapView에 접근성 지원을 추가하는 Helper
class TMapAccessibilityHelper(
    private val view: TMapView,
    private val getMarkers: () -> List<MarkerInfo>,
    private val getScreenBounds: (MarkerInfo) -> Rect
) : ExploreByTouchHelper(view) {

    override fun getVirtualViewAt(x: Float, y: Float): Int {
        val markers = getMarkers()
        for ((index, marker) in markers.withIndex()) {
            val bounds = getScreenBounds(marker)
            if (bounds.contains(x.toInt(), y.toInt())) {
                return index
            }
        }
        return INVALID_ID
    }

    override fun getVisibleVirtualViews(virtualViewIds: MutableList<Int>) {
        val markers = getMarkers()
        for (i in markers.indices) {
            virtualViewIds.add(i)
        }
    }

    override fun onPopulateNodeForVirtualView(
        virtualViewId: Int,
        node: AccessibilityNodeInfoCompat
    ) {
        val markers = getMarkers()
        if (virtualViewId < 0 || virtualViewId >= markers.size) {
            return
        }

        val marker = markers[virtualViewId]
        val bounds = getScreenBounds(marker)

        node.text = marker.label
        node.contentDescription = marker.label
        node.className = "android.view.View"
        node.addAction(AccessibilityNodeInfoCompat.ACTION_CLICK)
        node.isClickable = true
        node.isFocusable = true
        node.setBoundsInParent(bounds)
    }

    override fun onPopulateEventForVirtualView(
        virtualViewId: Int,
        event: AccessibilityEvent
    ) {
        val markers = getMarkers()
        if (virtualViewId < 0 || virtualViewId >= markers.size) {
            return
        }

        val marker = markers[virtualViewId]
        event.className = "android.view.View"
        event.contentDescription = marker.label
        event.text.clear()
        event.text.add(marker.label)
    }

    override fun onPerformActionForVirtualView(
        virtualViewId: Int,
        action: Int,
        arguments: Bundle?
    ): Boolean {
        if (action == AccessibilityNodeInfoCompat.ACTION_CLICK) {
            // 마커 클릭 이벤트는 TMapView의 기존 onPress에서 처리됨
            return true
        }
        return false
    }
}

class TMapViewManager : SimpleViewManager<TMapView>() {

    // 각 TMapView 인스턴스별로 마커 리스트 저장
    private val markersMap = mutableMapOf<TMapView, MutableList<MarkerInfo>>()
    private val accessibilityHelperMap = mutableMapOf<TMapView, TMapAccessibilityHelper>()

    override fun getName() = "SKTTMapView"

    override fun createViewInstance(ctx: ThemedReactContext): TMapView {
        val view = TMapView(ctx)
        view.setSKTMapApiKey("JT4qeFOp7e438Wx4rsj419607dvmdw3X3SOhcBKy")
        view.setZoomLevel(15)
        view.setCenterPoint(126.9780, 37.5665)
        view.setIconVisibility(true)
        view.setCompassMode(false)
        view.setSightVisible(false)

        // 마커 리스트 초기화
        markersMap[view] = mutableListOf()

        // 접근성 헬퍼 설정
        val helper = TMapAccessibilityHelper(
            view = view,
            getMarkers = { markersMap[view] ?: emptyList() },
            getScreenBounds = { marker -> getMarkerScreenBounds(view, marker) }
        )
        accessibilityHelperMap[view] = helper
        ViewCompat.setAccessibilityDelegate(view, helper)
        view.importantForAccessibility = View.IMPORTANT_FOR_ACCESSIBILITY_YES

        Log.d("TMapViewManager", "✅ TMapView instance created with accessibility")
        return view
    }

    // 마커의 화면 좌표를 계산 (뷰 전체 영역으로 노출)
    private fun getMarkerScreenBounds(view: TMapView, marker: MarkerInfo): Rect {
        // TMap SDK가 좌표 변환 API를 노출하지 않아, 최소한 TalkBack이 포커스를 줄 수 있도록
        // 뷰의 가시 영역 전체를 터치 영역으로 사용합니다.
        val width = if (view.width > 0) view.width else view.resources.displayMetrics.widthPixels
        val height = if (view.height > 0) view.height else view.resources.displayMetrics.heightPixels
        val safeWidth = if (width > 0) width else 1
        val safeHeight = if (height > 0) height else 1
        return Rect(0, 0, safeWidth, safeHeight)
    }

    override fun onDropViewInstance(view: TMapView) {
        super.onDropViewInstance(view)
        markersMap.remove(view)
        accessibilityHelperMap.remove(view)
    }

    /* ==== Props ==== */
    @ReactProp(name = "apiKey")
    fun setApiKey(view: TMapView, key: String?) {
        if (!key.isNullOrBlank()) view.setSKTMapApiKey(key)
    }

    @ReactProp(name = "centerLat", defaultDouble = 37.5665)
    fun setCenterLat(view: TMapView, lat: Double) {
        val lon = view.centerPoint.longitude
        view.setCenterPoint(lon, lat)
    }

    @ReactProp(name = "centerLon", defaultDouble = 126.9780)
    fun setCenterLon(view: TMapView, lon: Double) {
        val lat = view.centerPoint.latitude
        view.setCenterPoint(lon, lat)
    }

    @ReactProp(name = "zoomLevel", defaultInt = 15)
    fun setZoom(view: TMapView, level: Int) {
        view.setZoomLevel(level)
    }

    /* ==== Events ==== */
    override fun addEventEmitters(ctx: ThemedReactContext, view: TMapView) {
        view.setOnMapReadyListener {
            ctx.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onMapReady", null)
        }

        view.setOnClickListenerCallback(object : TMapView.OnClickListenerCallback {
            override fun onPressDown(
                markerList: ArrayList<TMapMarkerItem>,
                poiList: ArrayList<TMapPOIItem>,
                point: TMapPoint,
                pointf: PointF
            ) {}

            override fun onPressUp(
                markerList: ArrayList<TMapMarkerItem>,
                poiList: ArrayList<TMapPOIItem>,
                point: TMapPoint,
                pointf: PointF
            ) {
                val payload = Arguments.createMap().apply {
                    putDouble("lat", point.latitude)
                    putDouble("lon", point.longitude)
                }
                ctx.getJSModule(RCTEventEmitter::class.java)
                    .receiveEvent(view.id, "onPress", payload)
            }
        })
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> =
        MapBuilder.builder<String, Any>()
            .put("onMapReady", MapBuilder.of("registrationName", "onMapReady"))
            .put("onPress", MapBuilder.of("registrationName", "onPress"))
            .build()

    /* ==== Commands ==== */
    override fun getCommandsMap(): MutableMap<String, Int> =
        MapBuilder.of(
            "animateTo",
            1,
            "addMarker",
            2,
            "addRoute",
            3,
            "addPolyline",
            4,
            "addMarkerWithIcon",
            5,
            "clear",
            6
        )

    override fun receiveCommand(view: TMapView, commandId: Int, args: ReadableArray?) {
        when (commandId) {
            // animateTo(lat, lon, zoom)
            1 -> {
                if (args == null || args.size() < 3) return
                val lat = args.getDouble(0)
                val lon = args.getDouble(1)
                val zoom = args.getInt(2)
                view.setCenterPoint(lon, lat)
                view.setZoomLevel(zoom)
            }

            // addMarker(lat, lon, title)
            2 -> {
                if (args == null || args.size() < 3) return
                val lat = args.getDouble(0)
                val lon = args.getDouble(1)
                val title = args.getString(2) ?: ""

                val point = TMapPoint(lat, lon)
                val marker = TMapMarkerItem().apply {
                    id = "marker_${lat}_${lon}"
                    setTMapPoint(point)
                    setName(title)

                    val iconResId = if (title.contains("출발") || title.contains("start", true)) {
                        R.drawable.marker_start
                    } else {
                        R.drawable.marker_end
                    }
                    val originalBitmap = BitmapFactory.decodeResource(view.resources, iconResId)
                    val scaledBitmap = Bitmap.createScaledBitmap(originalBitmap, 150, 150, true)
                    setIcon(scaledBitmap)
                }
                view.addTMapMarkerItem(marker)

                // 마커 리스트에 추가
                val markersList = markersMap[view]
                if (markersList != null) {
                    markersList.add(MarkerInfo("marker_${lat}_${lon}", lat, lon, title))
                    // 접근성 헬퍼 업데이트
                    accessibilityHelperMap[view]?.invalidateRoot()
                }

                view.setCenterPoint(lon, lat)
            }

            // addPolyline(points)
            4 -> {
                if (args == null || args.size() == 0) return
                try {
                    val coords = args.getArray(0)
                    val polyLine = TMapPolyLine().apply {
                        lineColor = android.graphics.Color.parseColor("#FFCC00")
                        lineWidth = 8f
                        lineAlpha = 255
                    }

                    for (i in 0 until coords!!.size()) {
                        val pointArr = coords.getArray(i)
                        val lon = pointArr!!.getDouble(0)
                        val lat = pointArr.getDouble(1)
                        polyLine.addLinePoint(TMapPoint(lat, lon))
                    }

                    view.addTMapPolyLine(polyLine)
                    Log.d("TMapViewManager", "🚶 Added pedestrian polyline (${coords!!.size()} points)")
                } catch (e: Exception) {
                    Log.e("TMapViewManager", "❌ addPolyline error: ${e.message}")
                }
            }

            // addMarkerWithIcon(lat, lon, title, iconName)
            5 -> {
                if (args == null || args.size() < 4) return
                val lat = args.getDouble(0)
                val lon = args.getDouble(1)
                val title = args.getString(2) ?: ""
                val iconName = args.getString(3) ?: ""

                val point = TMapPoint(lat, lon)
                val marker = TMapMarkerItem().apply {
                    id = "marker_${lat}_${lon}"
                    setTMapPoint(point)
                    setName(title)

                        // Try to load drawable by name from resources
                        var bitmap: Bitmap? = null
                        val resId = view.context.resources.getIdentifier(iconName, "drawable", view.context.packageName)
                        if (resId != 0) {
                            bitmap = BitmapFactory.decodeResource(view.resources, resId)
                        } else {
                            try {
                                    // Support HTTP/HTTPS asset URIs served by Metro (e.g. http://10.0.2.2:8081/assets/...)
                                    if (iconName.startsWith("http://") || iconName.startsWith("https://")) {
                                        // Network IO must not run on UI thread; spawn a background thread to fetch the image
                                        val urlString = iconName
                                        Thread {
                                            try {
                                                val url = java.net.URL(urlString)
                                                val conn = url.openConnection()
                                                conn.connectTimeout = 5000
                                                conn.readTimeout = 5000
                                                val input = conn.getInputStream()
                                                val urlBitmap = BitmapFactory.decodeStream(input)
                                                input.close()
                                                if (urlBitmap != null) {
                                                    // Post marker creation back to UI thread
                                                    view.post {
                                                        try {
                                                            val point = TMapPoint(lat, lon)
                                                            val marker = TMapMarkerItem().apply {
                                                                id = "marker_${lat}_${lon}"
                                                                setTMapPoint(point)
                                                                setName(title)
                                                                val scaledBitmap = Bitmap.createScaledBitmap(urlBitmap, 150, 150, true)
                                                                setIcon(scaledBitmap)
                                                            }
                                                            view.addTMapMarkerItem(marker)
                                                        } catch (e: Exception) {
                                                            Log.w("TMapViewManager", "add marker from http failed: ${e.message}")
                                                        }
                                                    }
                                                }
                                            } catch (e: Exception) {
                                                Log.w("TMapViewManager", "http asset load failed: ${e.message}")
                                            }
                                        }.start()
                                        // We've launched async marker creation, skip rest of sync processing
                                        return
                                    }

                                // Handle common URI patterns:
                                // file:// -> decodeFile
                                // asset:/some/path -> load from assets with path after 'asset:/'
                                // content:// -> open via content resolver
                                if (iconName.startsWith("file://")) {
                                    val filePath = iconName.removePrefix("file://")
                                    val fileBitmap = BitmapFactory.decodeFile(filePath)
                                    if (fileBitmap != null) bitmap = fileBitmap
                                } else if (iconName.startsWith("asset:/") || iconName.startsWith("asset://")) {
                                    val assetPath = iconName.substringAfter("asset:/")
                                    try {
                                        val stream = view.context.assets.open(assetPath)
                                        bitmap = BitmapFactory.decodeStream(stream)
                                        stream.close()
                                    } catch (e: Exception) {
                                        Log.w("TMapViewManager", "asset load failed for $assetPath: ${e.message}")
                                    }
                                } else if (iconName.startsWith("content://")) {
                                    try {
                                        val uri = android.net.Uri.parse(iconName)
                                        val input = view.context.contentResolver.openInputStream(uri)
                                        bitmap = BitmapFactory.decodeStream(input)
                                        input?.close()
                                    } catch (e: Exception) {
                                        Log.w("TMapViewManager", "content uri load failed: ${e.message}")
                                    }
                                } else if (iconName.startsWith("/")) {
                                    val fileBitmap = BitmapFactory.decodeFile(iconName)
                                    if (fileBitmap != null) bitmap = fileBitmap
                                }
                            } catch (e: Exception) {
                                Log.w("TMapViewManager", "파일/자산에서 아이콘 로드 실패: ${e.message}")
                            }

                            if (bitmap == null) {
                                // Try loading from app assets (both provided name and prefixed with 'asset/')
                                val tryNames = arrayOf(iconName, "asset/$iconName", if (iconName.endsWith(".png")) iconName else "$iconName.png")
                                for (n in tryNames) {
                                    try {
                                        val stream = view.context.assets.open(n)
                                        bitmap = BitmapFactory.decodeStream(stream)
                                        stream.close()
                                        if (bitmap != null) break
                                    } catch (ignored: Exception) {
                                        // ignore and try next
                                    }
                                }
                            }

                            // final fallback to default drawable
                            if (bitmap == null) {
                                bitmap = BitmapFactory.decodeResource(view.resources, R.drawable.marker_end)
                            }
                        }

                        val scaledBitmap = Bitmap.createScaledBitmap(bitmap!!, 150, 150, true)
                        setIcon(scaledBitmap)
                }
                view.addTMapMarkerItem(marker)

                // 마커 리스트에 추가 (5번째 파라미터가 접근성 레이블)
                val markersList = markersMap[view]
                if (markersList != null) {
                    // 5번째 파라미터로 접근성 레이블을 받을 수 있도록 확장
                    val accessibilityLabel = if (args.size() >= 5) args.getString(4) ?: title else title
                    markersList.add(MarkerInfo("marker_${lat}_${lon}", lat, lon, accessibilityLabel))
                    // 접근성 헬퍼 업데이트
                    accessibilityHelperMap[view]?.invalidateRoot()
                }
            }

            // clear()
            6 -> {
                view.removeAllTMapMarkerItem()   // 마커 제거
                view.removeAllTMapPolyLine()     // 경로 제거

                // 접근성 마커 리스트도 초기화
                markersMap[view]?.clear()
                accessibilityHelperMap[view]?.invalidateRoot()

                Log.d("TMapViewManager", "🧹 Map cleared (markers + polylines)")
            }
        }
    }

    // ✅ 여기에 정확히 있어야 함 (클래스 내부)
    @ReactMethod
    fun setCenter(view: TMapView, lat: Double, lon: Double) {
        view.setCenterPoint(lon, lat)
        Log.d("TMapViewManager", "📍 setCenter called from JS → ($lat, $lon)")
    }
}
