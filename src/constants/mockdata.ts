import type { FC } from 'react';
import type { SvgProps } from 'react-native-svg';
import { ImageSourcePropType } from 'react-native';


export type NotificationItem = {
    id: string;
    image: FC<SvgProps>;
    title: string;
    description: string;
};

export const NOTIFICATIONS: NotificationItem[] = [
    {
        id: '1',
        image: require('../assets/notification/notification1.svg').default,
        title: 'Collect your Medicines',
        description: 'Your medicines are ready please contact here and collect it.',
    },
    {
        id: '2',
        image: require('../assets/notification/notification2.svg').default,
        title: 'Your Lab report is ready',
        description: 'Your lab test report is ready please contact here and collect it.',
    },
    {
        id: '3',
        image: require('../assets/notification/notification3.svg').default,
        title: 'Your Scan report is ready',
        description: 'Your Radiology report is ready please contact here and collect it.',
    },
    {
        id: '4',
        image: require('../assets/notification/notification4.svg').default,
        title: 'Your Physiotherapist is ready',
        description: 'Please contact here for your physiotherapy.',
    },
    {
        id: '5',
        image: require('../assets/notification/notification5.svg').default,
        title: 'Appointment Alarm',
        description: 'Your appointment will be start after 15 minutes. Stay with app and take care',
    },
    {
        id: '6',
        image: require('../assets/notification/notification6.svg').default,
        title: 'Upcoming Appointment',
        description: 'Your appointment will be start after 15 minutes. Stay with app and take care',
    },
    {
        id: '7',
        image: require('../assets/notification/notification7.svg').default,
        title: 'Appointment Pending',
        description: 'Your appointment will be start after 15 minutes. Stay with app and take care',
    },
];


export const DOCTORS = [
    {
        id: '1',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Ashika Rao',
        speciality: 'General Physician, Arogya Clinic',
        experience: '10 years exp',
    },
    {
        id: '2',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Meera Shah',
        speciality: 'Cardiologist, Sunrise Care',
        experience: '12 years exp',
    },
    {
        id: '3',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Rohan Iyer',
        speciality: 'Dermatologist, Skin Plus',
        experience: '8 years exp',
    },
    {
        id: '4',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Neha Kapoor',
        speciality: 'Pediatrician, Happy Kids Clinic',
        experience: '9 years exp',
    },
    {
        id: '5',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Arjun Menon',
        speciality: 'Orthopedic, Ortho Life',
        experience: '14 years exp',
    },
    {
        id: '6',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Kavya Nair',
        speciality: 'ENT Specialist, City Care',
        experience: '7 years exp',
    },
    {
        id: '7',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Priya Deshmukh',
        speciality: 'Neurologist, Neuro Plus',
        experience: '11 years exp',
    },
    {
        id: '8',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Sameer Joshi',
        speciality: 'Pulmonologist, Breathe Well Clinic',
        experience: '13 years exp',
    },
    {
        id: '9',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Ananya Sen',
        speciality: 'Gynecologist, Women Care Center',
        experience: '10 years exp',
    },
    {
        id: '10',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Vivek Sinha',
        speciality: 'Gastroenterologist, Digestive Health',
        experience: '15 years exp',
    },
    {
        id: '11',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Shruti Patil',
        speciality: 'Psychiatrist, Mind Balance Clinic',
        experience: '6 years exp',
    },
    {
        id: '12',
        image: require('../assets/Banner/doctor.png') as ImageSourcePropType,
        name: 'Dr. Kiran Bhat',
        speciality: 'Endocrinologist, Metro Health',
        experience: '9 years exp',
    },
];
