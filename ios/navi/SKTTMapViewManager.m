// SKTTMapViewManager.m
#import "SKTTMapViewManager.h"
#import "SKTTMapView.h"
#import <React/RCTUIManager.h>

@implementation SKTTMapViewManager

RCT_EXPORT_MODULE(SKTTMapView)

- (UIView *)view
{
    return [[SKTTMapView alloc] init];
}

#pragma mark - Props
RCT_EXPORT_VIEW_PROPERTY(appKey, NSString)

#pragma mark - JS → Native Commands

- (NSDictionary *)constantsToExport
{
    return @{
        @"Commands": @{
            @"animateTo": @(0),
            @"addMarker": @(1),
            @"addMarkerWithIcon": @(2),
            @"addPolyline": @(3)
        }
    };
}

RCT_EXPORT_METHOD(dispatchCommand:(nonnull NSNumber *)reactTag
                  commandId:(nonnull NSNumber *)commandId
                  args:(NSArray *)args)
{
    [self.bridge.uiManager addUIBlock:^(__unused RCTUIManager *uiManager,
                                       NSDictionary<NSNumber *, UIView *> *viewRegistry) {

        SKTTMapView *view = (SKTTMapView *)viewRegistry[reactTag];
        if (!view || ![view isKindOfClass:[SKTTMapView class]]) return;

        switch (commandId.integerValue) {

            case 0:
                [view animateToLat:[args[0] doubleValue]
                               lon:[args[1] doubleValue]
                              zoom:[args[2] doubleValue]];
                break;

            case 1:
                [view addMarkerLat:[args[0] doubleValue]
                                lon:[args[1] doubleValue]
                              title:args[2]];
                break;

            case 2:
                [view addMarkerWithIconLat:[args[0] doubleValue]
                                       lon:[args[1] doubleValue]
                                     title:args[2]
                                  iconName:args[3]];
                break;

            case 3:
                [view addPolyline:args[0]];
                break;

            default:
                break;
        }
    }];
}

@end
