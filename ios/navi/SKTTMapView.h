// SKTTMapView.h
#import <UIKit/UIKit.h>
#import <TMapSDK/TMapSDK.h>

@interface SKTTMapView : UIView <MGLMapViewDelegate>

@property (nonatomic, strong) MGLMapView *mapView;
@property (nonatomic, strong) NSString *appKey;

- (void)animateToLat:(double)lat lon:(double)lon zoom:(double)zoom;
- (void)addMarkerLat:(double)lat lon:(double)lon title:(NSString *)title;
- (void)addMarkerWithIconLat:(double)lat
                         lon:(double)lon
                       title:(NSString *)title
                    iconName:(NSString *)iconName;
- (void)addPolyline:(NSArray *)coords;

@end
