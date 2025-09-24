package com.navi.map

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class TMapPackage : ReactPackage {
    override fun createNativeModules(rc: ReactApplicationContext): List<NativeModule> = emptyList()
    override fun createViewManagers(rc: ReactApplicationContext): List<ViewManager<*, *>> =
        listOf(TMapViewManager())
}
