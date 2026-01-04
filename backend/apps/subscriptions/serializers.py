from rest_framework import serializers
from .models import Feature, Subscription
from apps.schools.serializers import SchoolSerializer

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ['id', 'name', 'code', 'description', 'price', 'is_active']

class SubscriptionSerializer(serializers.ModelSerializer):
    feature_details = FeatureSerializer(source='feature', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)

    class Meta:
        model = Subscription
        fields = ['id', 'school', 'school_name', 'feature', 'feature_details', 'is_active', 'start_date', 'end_date', 'auto_renew']
        read_only_fields = ['id', 'start_date']
