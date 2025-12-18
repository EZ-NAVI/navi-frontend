#import "SKTTMapView.h"
#import <TMapSDK/TMapSDK-Swift.h>
#import <objc/runtime.h>

@interface SKTTMapView () <TMapViewDelegate>
@end

@implementation SKTTMapView

#pragma mark - Init

- (instancetype)init {
    if (self = [super init]) {
        NSLog(@"[SKTTMapView] init called");
        self.backgroundColor = [UIColor clearColor];
        self.clipsToBounds = YES;
    }
    return self;
}

#pragma mark - appKey Setter

- (void)setAppKey:(NSString *)appKey {
    NSLog(@"[SKTTMapView] setAppKey called with appKey: %@", appKey);
    _appKey = appKey;

    if (appKey == nil || appKey.length == 0) {
        NSLog(@"[SKTTMapView] Empty appKey");
        return;
    }

    [self setNeedsLayout];
}

#pragma mark - Layout

- (void)layoutSubviews {
    [super layoutSubviews];
    NSLog(@"[SKTTMapView] layoutSubviews called - bounds: %@", NSStringFromCGRect(self.bounds));

    if (CGRectIsEmpty(self.bounds)) {
        NSLog(@"[SKTTMapView] bounds is empty, waiting...");
        return;
    }

    if (_tMapView == nil && _appKey && _appKey.length > 0) {
        NSLog(@"[SKTTMapView] Creating TMapView with bounds: %@", NSStringFromCGRect(self.bounds));

        _tMapView = [[TMapView alloc] initWithFrame:self.bounds];

        // ✅ 디버깅: TMapView의 모든 메서드 출력
        [self logAvailableMethods:[_tMapView class]];

        // ✅ delegate 설정 시도 (여러 방법)
        [self setupDelegate];

        // ✅ API 키 설정 (여러 방법 시도)
        [self setupApiKey];

        NSLog(@"[SKTTMapView] TMapView created: %@", _tMapView);

        _tMapView.autoresizingMask = UIViewAutoresizingFlexibleWidth | UIViewAutoresizingFlexibleHeight;

        [self addSubview:_tMapView];
        [self bringSubviewToFront:_tMapView];
        NSLog(@"[SKTTMapView] tMapView added to subview");
    }

    if (_tMapView) {
        _tMapView.frame = self.bounds;
        NSLog(@"[SKTTMapView] tMapView frame set to: %@", NSStringFromCGRect(_tMapView.frame));
    }
}

#pragma mark - Helper Methods

- (void)logAvailableMethods:(Class)cls {
    NSLog(@"[SKTTMapView] === Available methods for %@ ===", NSStringFromClass(cls));
    unsigned int methodCount = 0;
    Method *methods = class_copyMethodList(cls, &methodCount);
    for (unsigned int i = 0; i < methodCount; i++) {
        SEL selector = method_getName(methods[i]);
        NSString *methodName = NSStringFromSelector(selector);
        // API 키, delegate 관련 메서드만 출력
        if ([methodName.lowercaseString containsString:@"api"] ||
            [methodName.lowercaseString containsString:@"key"] ||
            [methodName.lowercaseString containsString:@"delegate"] ||
            [methodName.lowercaseString containsString:@"skt"]) {
            NSLog(@"  📌 %@", methodName);
        }
    }
    free(methods);
    NSLog(@"[SKTTMapView] === End of methods ===");
}

- (void)setupDelegate {
    // 방법 1: KVC
    @try {
        [_tMapView setValue:self forKey:@"delegate"];
        NSLog(@"[SKTTMapView] ✅ Delegate set via KVC");
        return;
    } @catch (NSException *exception) {
        NSLog(@"[SKTTMapView] KVC delegate failed: %@", exception.reason);
    }

    // 방법 2: setDelegate:
    SEL setDelegateSel = NSSelectorFromString(@"setDelegate:");
    if ([_tMapView respondsToSelector:setDelegateSel]) {
        #pragma clang diagnostic push
        #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
        [_tMapView performSelector:setDelegateSel withObject:self];
        #pragma clang diagnostic pop
        NSLog(@"[SKTTMapView] ✅ Delegate set via setDelegate:");
        return;
    }

    // 방법 3: setTmapDelegate:
    SEL setTmapDelegateSel = NSSelectorFromString(@"setTmapDelegate:");
    if ([_tMapView respondsToSelector:setTmapDelegateSel]) {
        #pragma clang diagnostic push
        #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
        [_tMapView performSelector:setTmapDelegateSel withObject:self];
        #pragma clang diagnostic pop
        NSLog(@"[SKTTMapView] ✅ Delegate set via setTmapDelegate:");
        return;
    }

    NSLog(@"[SKTTMapView] ❌ All delegate setup methods failed!");
}

- (void)setupApiKey {
    NSArray *selectorNames = @[
        @"setSKTMapApiKey:",      // Android와 동일한 이름
        @"setApiKey:",
        @"setSktMapApiKey:",
        @"setTMapApiKey:",
        @"setAppKey:",
        @"apiKey:",               // Swift getter/setter 형태
        @"setAPIKey:"
    ];

    for (NSString *selName in selectorNames) {
        SEL sel = NSSelectorFromString(selName);
        if ([_tMapView respondsToSelector:sel]) {
            NSLog(@"[SKTTMapView] ✅ Setting API key via %@", selName);
            #pragma clang diagnostic push
            #pragma clang diagnostic ignored "-Warc-performSelector-leaks"
            [_tMapView performSelector:sel withObject:_appKey];
            #pragma clang diagnostic pop
            return;
        }
    }

    NSLog(@"[SKTTMapView] ❌ No API key setter found!");
}

#pragma mark - TMapViewDelegate

- (void)mapViewDidFinishLoadingMap {
    NSLog(@"[SKTTMapView] ✅ MAP LOADED SUCCESSFULLY!");
    if (self.onMapReady) {
        self.onMapReady(@{});
    }
}

- (void)SKTMapApikeySucceed {
    NSLog(@"[SKTTMapView] ✅ API KEY VERIFIED!");
}

- (void)SKTMapApikeyFailedWithError:(NSError *)error {
    NSLog(@"[SKTTMapView] ❌ API KEY FAILED: %@", error.localizedDescription);
}

- (void)mapView:(TMapView *)mapView singleTapOnMap:(CLLocationCoordinate2D)location {
    NSLog(@"[SKTTMapView] Single tap at: %f, %f", location.latitude, location.longitude);
    if (self.onPress) {
        self.onPress(@{
            @"lat": @(location.latitude),
            @"lon": @(location.longitude)
        });
    }
}

- (void)mapView:(TMapView *)mapView longTapOnMap:(CLLocationCoordinate2D)location {
    NSLog(@"[SKTTMapView] Long tap at: %f, %f", location.latitude, location.longitude);
    if (self.onLongPress) {
        self.onLongPress(@{
            @"lat": @(location.latitude),
            @"lon": @(location.longitude)
        });
    }
}

#pragma mark - Public Methods

- (void)animateToLat:(double)lat lon:(double)lon zoom:(double)zoom {
    // TODO: 구현
}

- (void)addMarkerLat:(double)lat lon:(double)lon title:(NSString *)title {
    // TODO: 구현
}

- (void)addMarkerWithIconLat:(double)lat lon:(double)lon title:(NSString *)title iconName:(NSString *)iconName {
    // TODO: 구현
}

- (void)addPolyline:(NSArray *)coords {
    // TODO: 구현
}

@end
