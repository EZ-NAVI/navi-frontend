package com.navi.map

import android.graphics.BitmapFactory
import android.graphics.Bitmap
import android.util.Log
import android.graphics.PointF
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.navi.R
import com.skt.tmap.TMapData
import com.skt.tmap.TMapPoint
import com.skt.tmap.TMapView
import com.skt.tmap.overlay.TMapMarkerItem
import com.skt.tmap.overlay.TMapPolyLine
import com.skt.tmap.poi.TMapPOIItem

class TMapViewManager : SimpleViewManager<TMapView>() {

    override fun getName() = "SKTTMapView"

    override fun createViewInstance(ctx: ThemedReactContext): TMapView {
        val view = TMapView(ctx)
        view.setSKTMapApiKey("JT4qeFOp7e438Wx4rsj419607dvmdw3X3SOhcBKy")
        view.setZoomLevel(15)
        view.setCenterPoint(126.9780, 37.5665)
        view.setIconVisibility(true)
        view.setCompassMode(false)
        view.setSightVisible(false)
        Log.d("TMapViewManager", "✅ TMapView instance created")
        return view
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
            5
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
