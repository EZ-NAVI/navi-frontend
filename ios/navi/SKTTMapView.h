// SKTTMapView.h
#import <UIKit/UIKit.h>
#import <React/RCTComponent.h>
#import <TMapSDK/TMapSDK-Swift.h>

@interface SKTTMapView : UIView <TMapViewDelegate>

@property (nonatomic, strong) TMapView *tMapView;
@property (nonatomic, strong) NSString *appKey;

@property (nonatomic, copy) RCTDirectEventBlock onMapReady;
@property (nonatomic, copy) RCTBubblingEventBlock onPress;
@property (nonatomic, copy) RCTBubblingEventBlock onLongPress;

- (void)animateToLat:(double)lat lon:(double)lon zoom:(double)zoom;
- (void)addMarkerLat:(double)lat lon:(double)lon title:(NSString *)title;
- (void)addMarkerWithIconLat:(double)lat lon:(double)lon title:(NSString *)title iconName:(NSString *)iconName;
- (void)addPolyline:(NSArray *)coords;

@end
