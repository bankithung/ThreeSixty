from rest_framework import serializers
from .models import Feature, Subscription, Transaction
from apps.schools.serializers import SchoolSerializer

class FeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feature
        fields = ['id', 'name', 'code', 'description', 'price', 'pricing_type', 'tiers', 'is_active']

class SubscriptionSerializer(serializers.ModelSerializer):
    feature_details = FeatureSerializer(source='feature', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_logo = serializers.ImageField(source='school.logo', read_only=True)

    class Meta:
        model = Subscription
        fields = ['id', 'school', 'school_name', 'school_logo', 'feature', 'feature_details', 'is_active', 'start_date', 'end_date', 'auto_renew']
        read_only_fields = ['id', 'start_date']

class TransactionSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_city = serializers.CharField(source='school.city', read_only=True)
    school_logo = serializers.ImageField(source='school.logo', read_only=True)
    feature_name = serializers.CharField(source='feature.name', read_only=True)

    class Meta:
        model = Transaction
        fields = ['id', 'school', 'school_name', 'school_city', 'school_logo', 'feature', 'feature_name', 'amount', 'status', 'transaction_date', 'payment_method', 'reference_id', 'description', 'period_start', 'period_end']
        read_only_fields = ['id', 'transaction_date']
