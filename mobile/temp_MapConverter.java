package com.lugg.RNCConfig;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.util.Iterator;
import java.util.List;
import java.util.Map;

public class MapConverter {
    public static WritableMap convertMapToWritableMap(Map<String, Object> map) {
        WritableMap writableMap = Arguments.createMap();
        Iterator iterator = map.entrySet().iterator();

        while(iterator.hasNext()) {
            Map.Entry pair = (Map.Entry)iterator.next();
            Object value = pair.getValue();
            if (value == null) {
                writableMap.putNull((String)pair.getKey());
            } else if (value instanceof Boolean) {
                writableMap.putBoolean((String)pair.getKey(), (Boolean)value);
            } else if (value instanceof Double) {
                writableMap.putDouble((String)pair.getKey(), (Double)value);
            } else if (value instanceof Integer) {
                writableMap.putInt((String)pair.getKey(), (Integer)value);
            } else if (value instanceof Long) {
                 // Fix: Cast Long to Double as putLong doesn't exist in newer RN
                writableMap.putDouble((String)pair.getKey(), ((Long)value).doubleValue());
            } else if (value instanceof String) {
                writableMap.putString((String)pair.getKey(), (String)value);
            } else if (value instanceof Map) {
                writableMap.putMap((String)pair.getKey(), convertMapToWritableMap((Map)value));
            } else if (value instanceof List) {
                writableMap.putArray((String)pair.getKey(), convertListToWritableArray((List)value));
            } else {
                writableMap.putString((String)pair.getKey(), value.toString());
            }
        }

        return writableMap;
    }

    public static WritableArray convertListToWritableArray(List<Object> list) {
        WritableArray writableArray = Arguments.createArray();
        Iterator iterator = list.iterator();

        while(iterator.hasNext()) {
            Object value = iterator.next();
            if (value == null) {
                writableArray.pushNull();
            } else if (value instanceof Boolean) {
                writableArray.pushBoolean((Boolean)value);
            } else if (value instanceof Double) {
                writableArray.pushDouble((Double)value);
            } else if (value instanceof Integer) {
                writableArray.pushInt((Integer)value);
            } else if (value instanceof Long) {
                 // Fix: Cast Long to Double
                writableArray.pushDouble(((Long)value).doubleValue());
            } else if (value instanceof String) {
                writableArray.pushString((String)value);
            } else if (value instanceof Map) {
                writableArray.pushMap(convertMapToWritableMap((Map)value));
            } else if (value instanceof List) {
                writableArray.pushArray(convertListToWritableArray((List)value));
            } else {
                writableArray.pushString(value.toString());
            }
        }

        return writableArray;
    }
}
