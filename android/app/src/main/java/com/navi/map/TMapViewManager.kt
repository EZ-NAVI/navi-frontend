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
import com.skt.tmap.TMapPoint
import com.skt.tmap.TMapView
import com.skt.tmap.overlay.TMapMarkerItem
import com.skt.tmap.overlay.TMapPolyLine
import com.skt.tmap.poi.TMapPOIItem

class TMapViewManager : SimpleViewManager<TMapView>() {

    override fun getName() = "SKTTMapView"

    // ⭐ 내 위치 마커를 기억해둘 필드 (한 번만 생성)
    private var myLocationMarker: TMapMarkerItem? = null

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
            ) {
            }

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
            "animateTo", 1,
            "addMarker", 2,
            "addRoute", 3,      // (지금은 안 쓰지만 남겨둠)
            "addPolyline", 4,
            "addOrMoveMarker", 5
        )

    override fun receiveCommand(view: TMapView, commandId: Int, args: ReadableArray?) {
        when (commandId) {

            /* animateTo(lat, lon, zoom) */
            1 -> {
                if (args == null || args.size() < 3) return
                val lat = args.getDouble(0)
                val lon = args.getDouble(1)
                val zoom = args.getInt(2)
                view.setCenterPoint(lon, lat)
                view.setZoomLevel(zoom)
            }

            /* 출발/도착 마커 */
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
                    val bmp = BitmapFactory.decodeResource(view.resources, iconResId)
                    val scaled = Bitmap.createScaledBitmap(bmp, 150, 150, true)
                    setIcon(scaled)
                }

                view.addTMapMarkerItem(marker)
                view.setCenterPoint(lon, lat)
            }

            /* ⭐ 내 위치 마커 (항상 1개 유지: 객체를 재사용해서 위치만 변경) */
            5 -> {
                if (args == null || args.size() < 3) return
                val lat = args.getDouble(0)
                val lon = args.getDouble(1)
                val id = args.getString(2) ?: "my-location"

                Log.d("TMapViewManager", "📍 addOrMoveMarker 호출: id=$id, lat=$lat, lon=$lon")

                val point = TMapPoint(lat, lon)

                if (myLocationMarker == null) {
                    // 처음 호출될 때만 마커 생성
                    myLocationMarker = TMapMarkerItem().apply {
                        this.id = id
                        setTMapPoint(point)
                        setName("내 위치")

                        val icon = BitmapFactory.decodeResource(view.resources, R.drawable.marker_me)
                        val scaled = Bitmap.createScaledBitmap(icon, 130, 130, true)
                        setIcon(scaled)
                    }

                    view.addTMapMarkerItem(myLocationMarker)
                } else {
                    // 이후에는 위치만 업데이트
                    myLocationMarker?.setTMapPoint(point)
                }

                // 다시 그리기
                view.invalidate()
            }

            /* Polyline */
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
                } catch (e: Exception) {
                    Log.e("TMapViewManager", "❌ addPolyline error: ${e.message}")
                }
            }
        }
    }

    @ReactMethod
    fun setCenter(view: TMapView, lat: Double, lon: Double) {
        view.setCenterPoint(lon, lat)
    }
}
