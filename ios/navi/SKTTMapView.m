// SKTTMapView.m
#import "SKTTMapView.h"

@implementation SKTTMapView

- (instancetype)init
{
    if (self = [super init]) {
        _mapView = [[MGLMapView alloc] initWithFrame:CGRectZero];
        _mapView.delegate = self;
        [self addSubview:_mapView];
    }
    return self;
}

- (void)layoutSubviews
{
    [super layoutSubviews];
    _mapView.frame = self.bounds;
}

// 지도 이동
- (void)animateToLat:(double)lat lon:(double)lon zoom:(double)zoom
{
    CLLocationCoordinate2D coord = CLLocationCoordinate2DMake(lat, lon);
    [_mapView setCenterCoordinate:coord zoomLevel:zoom animated:YES];
}

// 기본 마커
- (void)addMarkerLat:(double)lat lon:(double)lon title:(NSString *)title
{
    MGLPointAnnotation *anno = [[MGLPointAnnotation alloc] init];
    anno.coordinate = CLLocationCoordinate2DMake(lat, lon);
    anno.title = title;
    [_mapView addAnnotation:anno];
}

// 아이콘 마커
- (void)addMarkerWithIconLat:(double)lat
                         lon:(double)lon
                       title:(NSString *)title
                    iconName:(NSString *)iconName
{
    MGLPointAnnotation *anno = [[MGLPointAnnotation alloc] init];
    anno.coordinate = CLLocationCoordinate2DMake(lat, lon);
    anno.title = title;
    [_mapView addAnnotation:anno];
}

// Polyline
- (void)addPolyline:(NSArray *)coords
{
    NSUInteger count = coords.count;
    CLLocationCoordinate2D *points = malloc(sizeof(CLLocationCoordinate2D) * count);

    for (NSUInteger i = 0; i < count; i++) {
        NSArray *pair = coords[i]; // [lon, lat]
        points[i] = CLLocationCoordinate2DMake(
            [pair[1] doubleValue],
            [pair[0] doubleValue]
        );
    }

    MGLPolyline *line = [MGLPolyline polylineWithCoordinates:points count:count];
    free(points);

    [_mapView addAnnotation:line];
}

@end
