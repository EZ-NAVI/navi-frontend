package com.navi.map

import android.graphics.PointF
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter
import com.skt.tmap.TMapData
import com.skt.tmap.TMapPoint
import com.skt.tmap.TMapView
import com.skt.tmap.overlay.TMapMarkerItem
import com.skt.tmap.overlay.TMapPolyLine
import com.skt.tmap.poi.TMapPOIItem

class TMapViewManager : SimpleViewManager<TMapView>() {

    override fun getName() = "SKTTMapView"

    override fun createViewInstance(ctx: ThemedReactContext): TMapView = TMapView(ctx)

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
        // 지도 준비 완료
        view.setOnMapReadyListener {
            ctx.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onMapReady", null)
        }

        // 지도 탭 이벤트
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
        MapBuilder.of("animateTo", 1, "addMarker", 2, "addRoute", 3)

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
                }
                view.addTMapMarkerItem(marker)
                Log.d("TMapViewManager", "Marker added: $title ($lat,$lon)")
            }

            // addRoute(startLat, startLon, endLat, endLon)
            3 -> {
                if (args == null || args.size() < 4) return
                val startLat = args.getDouble(0)
                val startLon = args.getDouble(1)
                val endLat = args.getDouble(2)
                val endLon = args.getDouble(3)

                val startPoint = TMapPoint(startLat, startLon)
                val endPoint = TMapPoint(endLat, endLon)

                val tMapData = TMapData()
                tMapData.findPathData(startPoint, endPoint, object : TMapData.OnFindPathDataListener {
                    override fun onFindPathData(polyLine: TMapPolyLine?) {
                        if (polyLine != null) {
                            view.addTMapPolyLine(polyLine)
                            Log.d("TMapViewManager", "Route added successfully!")
                        }
                    }
                })
            }
        }
    }
}
