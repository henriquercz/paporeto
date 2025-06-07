import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, MessageCircle, Heart, Plus, Calendar } from 'lucide-react-native';
import { Colors, Fonts, Spacing, BorderRadius } from '@/constants/Colors';
import { Card } from '@/components/ui/Card';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TopicoComunidade {
  id: string;
  titulo: string;
  autor: string;
  mensagem: string;
  likes: number;
  respostas: number;
  dataPost: Date;
  categoria: string;
}

// Dados mock para demonstração
const TOPICOS_MOCK: TopicoComunidade[] = [
  {
    id: '1',
    titulo: 'Completei 30 dias sem cigarro! 🎉',
    autor: 'Maria Silva',
    mensagem: 'Pessoal, consegui! 30 dias sem cigarro. No começo foi muito difícil, mas vocês me ajudaram muito com o apoio...',
    likes: 24,
    respostas: 12,
    dataPost: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
    categoria: 'Conquistas',
  },
  {
    id: '2',
    titulo: 'Dicas para lidar com a ansiedade',
    autor: 'João Pedro',
    mensagem: 'Estou tendo muita ansiedade nos primeiros dias. Alguém tem dicas práticas que funcionaram?',
    likes: 8,
    respostas: 18,
    dataPost: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 horas atrás
    categoria: 'Ajuda',
  },
  {
    id: '3',
    titulo: 'Receita de suco detox que me ajuda',
    autor: 'Ana Costa',
    mensagem: 'Queria compartilhar uma receita que tem me ajudado muito nos momentos de vontade...',
    likes: 15,
    respostas: 7,
    dataPost: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
    categoria: 'Dicas',
  },
  {
    id: '4',
    titulo: 'Grupo de apoio local - São Paulo',
    autor: 'Carlos Oliveira',
    mensagem: 'Estou organizando um grupo de apoio presencial em SP. Quem tem interesse?',
    likes: 12,
    respostas: 25,
    dataPost: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 dias atrás
    categoria: 'Eventos',
  },
];

export default function ComunidadeScreen() {
  const [topicos, setTopicos] = useState<TopicoComunidade[]>(TOPICOS_MOCK);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('Todos');
  const [refreshing, setRefreshing] = useState(false);

  const categorias = ['Todos', 'Conquistas', 'Ajuda', 'Dicas', 'Eventos'];

  const onRefresh = () => {
    setRefreshing(true);
    // Simular carregamento
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const topicosFiltrados = filtroCategoria === 'Todos' 
    ? topicos 
    : topicos.filter(topico => topico.categoria === filtroCategoria);

  const formatarTempo = (data: Date) => {
    const agora = new Date();
    const diferenca = agora.getTime() - data.getTime();
    
    const minutos = Math.floor(diferenca / (1000 * 60));
    const horas = Math.floor(diferenca / (1000 * 60 * 60));
    const dias = Math.floor(diferenca / (1000 * 60 * 60 * 24));

    if (minutos < 60) {
      return `${minutos}min`;
    } else if (horas < 24) {
      return `${horas}h`;
    } else {
      return `${dias}d`;
    }
  };

  const getCategoriaColor = (categoria: string) => {
    switch (categoria) {
      case 'Conquistas': return Colors.success;
      case 'Ajuda': return Colors.primary.accent;
      case 'Dicas': return Colors.primary.light;
      case 'Eventos': return Colors.warning;
      default: return Colors.neutral.gray400;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={[Colors.primary.light, Colors.primary.dark]} 
        style={styles.header}
      >
        <SafeAreaView>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Comunidade</Text>
            <View style={styles.membersCount}>
              <Users size={20} color={Colors.neutral.white} strokeWidth={2} />
              <Text style={styles.membersText}>1.2k membros</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.content}>
        {/* Filtros de Categoria */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categorias.map((categoria) => (
            <TouchableOpacity
              key={categoria}
              style={[
                styles.categoryButton,
                filtroCategoria === categoria && styles.categoryButtonActive,
              ]}
              onPress={() => setFiltroCategoria(categoria)}
            >
              <Text style={[
                styles.categoryText,
                filtroCategoria === categoria && styles.categoryTextActive,
              ]}>
                {categoria}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Lista de Tópicos */}
        <ScrollView
          style={styles.topicsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {topicosFiltrados.map((topico) => (
            <Card key={topico.id} style={styles.topicCard}>
              <View style={styles.topicHeader}>
                <View style={styles.authorInfo}>
                  <View style={styles.avatar} />
                  <View style={styles.authorDetails}>
                    <Text style={styles.authorName}>{topico.autor}</Text>
                    <Text style={styles.postTime}>{formatarTempo(topico.dataPost)}</Text>
                  </View>
                </View>
                <View style={[
                  styles.categoryBadge,
                  { backgroundColor: getCategoriaColor(topico.categoria) }
                ]}>
                  <Text style={styles.categoryBadgeText}>{topico.categoria}</Text>
                </View>
              </View>

              <View style={styles.topicContent}>
                <Text style={styles.topicTitle}>{topico.titulo}</Text>
                <Text style={styles.topicMessage} numberOfLines={3}>
                  {topico.mensagem}
                </Text>
              </View>

              <View style={styles.topicFooter}>
                <TouchableOpacity style={styles.actionButton}>
                  <Heart size={16} color={Colors.neutral.gray400} strokeWidth={2} />
                  <Text style={styles.actionText}>{topico.likes}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionButton}>
                  <MessageCircle size={16} color={Colors.neutral.gray400} strokeWidth={2} />
                  <Text style={styles.actionText}>{topico.respostas}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.readMoreButton}>
                  <Text style={styles.readMoreText}>Ler mais</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}

          {/* Seção de Eventos */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Próximos Eventos</Text>
            
            <Card style={styles.eventCard}>
              <View style={styles.eventHeader}>
                <Calendar size={20} color={Colors.primary.accent} strokeWidth={2} />
                <Text style={styles.eventTitle}>Webinar: Técnicas de Respiração</Text>
              </View>
              <Text style={styles.eventDate}>Amanhã, 19:00</Text>
              <Text style={styles.eventDescription}>
                Aprenda técnicas de respiração para controlar a ansiedade
              </Text>
              <TouchableOpacity style={styles.eventButton}>
                <Text style={styles.eventButtonText}>Participar</Text>
              </TouchableOpacity>
            </Card>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>

      <FloatingActionButton
        onPress={() => {
          // Implementar criação de novo tópico
        }}
        icon={<Plus size={24} color={Colors.neutral.white} strokeWidth={2} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  title: {
    fontSize: Fonts.sizes.title,
    fontWeight: Fonts.weights.bold,
    color: Colors.neutral.white,
  },
  membersCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  membersText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.white,
  },
  content: {
    flex: 1,
    backgroundColor: Colors.neutral.gray100,
    marginTop: -Spacing.md,
  },
  categoriesContainer: {
    paddingVertical: Spacing.md,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.neutral.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary.dark,
    borderColor: Colors.primary.dark,
  },
  categoryText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.gray400,
  },
  categoryTextActive: {
    color: Colors.neutral.white,
  },
  topicsContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  topicCard: {
    marginBottom: Spacing.md,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary.light,
  },
  authorDetails: {
    gap: 2,
  },
  authorName: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.primary.dark,
  },
  postTime: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  categoryBadgeText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.white,
  },
  topicContent: {
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  topicTitle: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  topicMessage: {
    fontSize: Fonts.sizes.body,
    color: Colors.neutral.gray800,
    lineHeight: 20,
  },
  topicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
  },
  readMoreButton: {
    marginLeft: 'auto',
  },
  readMoreText: {
    fontSize: Fonts.sizes.small,
    color: Colors.primary.accent,
    fontWeight: Fonts.weights.medium,
  },
  section: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Fonts.sizes.subtitle,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
    marginBottom: Spacing.md,
  },
  eventCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary.accent,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  eventTitle: {
    fontSize: Fonts.sizes.body,
    fontWeight: Fonts.weights.bold,
    color: Colors.primary.dark,
  },
  eventDate: {
    fontSize: Fonts.sizes.small,
    color: Colors.primary.accent,
    fontWeight: Fonts.weights.medium,
    marginBottom: Spacing.sm,
  },
  eventDescription: {
    fontSize: Fonts.sizes.small,
    color: Colors.neutral.gray400,
    marginBottom: Spacing.md,
  },
  eventButton: {
    backgroundColor: Colors.primary.accent,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: 'flex-start',
  },
  eventButtonText: {
    fontSize: Fonts.sizes.small,
    fontWeight: Fonts.weights.medium,
    color: Colors.neutral.white,
  },
  bottomSpacing: {
    height: 100,
  },
});